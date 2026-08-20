//! A picture to put on a device, and how it goes on the wire.
//!
//! Everything here is pure: no bus, no daemon, no device. What talks to the
//! hardware takes a `Frame` and sends it — see the module docs.

/// One LED's colour. `u8` per channel because that is what the wire carries;
/// the compositor works in floats and lands here at the end.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct Rgb {
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

impl Rgb {
    pub const BLACK: Self = Self { r: 0, g: 0, b: 0 };

    pub const fn new(r: u8, g: u8, b: u8) -> Self {
        Self { r, g, b }
    }

    /// Scales every channel. Used by the brightness channel, which dims the
    /// picture rather than calling `setBrightness`: we are painting anyway, and
    /// a scaled pixel composes with everything else, where a device-wide
    /// brightness call would sit outside the composition entirely.
    pub fn scaled(self, factor: f32) -> Self {
        let clamp = |c: u8| (f32::from(c) * factor.clamp(0.0, 1.0)).round() as u8;
        Self::new(clamp(self.r), clamp(self.g), clamp(self.b))
    }
}

/// How many LEDs a device has, and how they are arranged.
///
/// Straight from `getMatrixDimensions`. Measured across the devices we serve:
/// 9x22 on a Huntsman Elite, 4x6 on a Tartarus V2, 1x14 on a Basilisk, 1x1 on a
/// Goliathus — the last of which can hold a colour but never a picture.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Geometry {
    pub rows: u8,
    pub columns: u8,
}

impl Geometry {
    pub const fn new(rows: u8, columns: u8) -> Self {
        Self { rows, columns }
    }

    pub fn led_count(self) -> usize {
        usize::from(self.rows) * usize::from(self.columns)
    }

    /// A single LED cannot show a gradient, a wave, or anything else with a
    /// shape. Worth asking before spending a frame on one.
    pub fn can_hold_a_picture(self) -> bool {
        self.led_count() > 1
    }
}

/// One picture, row-major.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Frame {
    geometry: Geometry,
    pixels: Vec<Rgb>,
}

impl Frame {
    pub fn filled(geometry: Geometry, colour: Rgb) -> Self {
        Self {
            geometry,
            pixels: vec![colour; geometry.led_count()],
        }
    }

    pub fn black(geometry: Geometry) -> Self {
        Self::filled(geometry, Rgb::BLACK)
    }

    pub fn geometry(&self) -> Geometry {
        self.geometry
    }

    fn index(&self, row: u8, column: u8) -> usize {
        usize::from(row) * usize::from(self.geometry.columns) + usize::from(column)
    }

    /// Out of bounds reads black rather than panicking. A compositor asking for
    /// a pixel off the edge is describing a shape wider than the device, which
    /// is ordinary — a wave crossing a 1x14 mouse should not bring the engine
    /// down.
    pub fn get(&self, row: u8, column: u8) -> Rgb {
        if row >= self.geometry.rows || column >= self.geometry.columns {
            return Rgb::BLACK;
        }
        self.pixels[self.index(row, column)]
    }

    pub fn set(&mut self, row: u8, column: u8, colour: Rgb) {
        if row >= self.geometry.rows || column >= self.geometry.columns {
            return;
        }
        let at = self.index(row, column);
        self.pixels[at] = colour;
    }

    pub fn row(&self, row: u8) -> &[Rgb] {
        let from = self.index(row, 0);
        &self.pixels[from..from + usize::from(self.geometry.columns)]
    }

    /// The frame boiled down to one colour.
    ///
    /// For the devices that cannot take a picture — a Kraken has no matrix at
    /// all, a Goliathus has one pixel — which still deserve to belong to the
    /// ambience. A mean rather than the brightest pixel: an ambience that is
    /// mostly dark with one bright band should read as dim, not as the band.
    pub fn average(&self) -> Rgb {
        if self.pixels.is_empty() {
            return Rgb::BLACK;
        }
        let count = self.pixels.len() as u32;
        let sum = self.pixels.iter().fold((0u32, 0u32, 0u32), |acc, p| {
            (
                acc.0 + u32::from(p.r),
                acc.1 + u32::from(p.g),
                acc.2 + u32::from(p.b),
            )
        });
        Rgb::new(
            (sum.0 / count) as u8,
            (sum.1 / count) as u8,
            (sum.2 / count) as u8,
        )
    }

    /// Which rows differ from the frame already on the device.
    ///
    /// This is the optimisation that matters, and the measurement says why: a
    /// frame costs one DBus round trip **per row**, about 700µs each, and the
    /// payload is nearly free — widening a row from 2 to 22 columns cost 0.4ms
    /// while going from 1 row to 9 cost 6.4ms. So the way to make a frame cheap
    /// is to send fewer rows, never smaller ones.
    ///
    /// A different geometry means every row is dirty: the device changed under
    /// us, and nothing about the old picture applies.
    pub fn rows_differing_from(&self, previous: &Frame) -> Vec<u8> {
        if previous.geometry != self.geometry {
            return (0..self.geometry.rows).collect();
        }
        (0..self.geometry.rows)
            .filter(|&row| self.row(row) != previous.row(row))
            .collect()
    }
}

/// One row, as `setKeyRow` wants it.
///
/// `[row, first_column, last_column, r, g, b, r, g, b, …]` — one triplet per
/// column from first to last **inclusive**. A count that disagrees with the
/// bounds is rejected by the driver rather than clipped, so the two are derived
/// from the same slice here and cannot drift apart.
pub fn row_payload(row: u8, pixels: &[Rgb]) -> Vec<u8> {
    debug_assert!(!pixels.is_empty(), "a row with no columns has no payload");

    let mut payload = Vec::with_capacity(3 + pixels.len() * 3);
    payload.push(row);
    payload.push(0);
    payload.push((pixels.len() - 1) as u8);
    for pixel in pixels {
        payload.extend_from_slice(&[pixel.r, pixel.g, pixel.b]);
    }
    payload
}

#[cfg(test)]
mod tests {
    use super::*;

    const MOUSE: Geometry = Geometry::new(1, 14);
    const KEYBOARD: Geometry = Geometry::new(9, 22);
    const SINGLE: Geometry = Geometry::new(1, 1);

    #[test]
    fn a_single_led_cannot_hold_a_picture() {
        // The Goliathus Extended is 1x1 for the whole bar. It can take a
        // colour; a gradient across it means nothing.
        assert!(!SINGLE.can_hold_a_picture());
        assert!(MOUSE.can_hold_a_picture());
    }

    #[test]
    fn reads_outside_the_matrix_are_black_not_a_panic() {
        let frame = Frame::filled(MOUSE, Rgb::new(1, 2, 3));

        assert_eq!(frame.get(0, 13), Rgb::new(1, 2, 3));
        assert_eq!(frame.get(0, 14), Rgb::BLACK);
        assert_eq!(frame.get(5, 0), Rgb::BLACK);
    }

    #[test]
    fn writes_outside_the_matrix_are_dropped() {
        let mut frame = Frame::black(MOUSE);
        frame.set(9, 9, Rgb::new(255, 0, 0));

        assert!(frame.row(0).iter().all(|p| *p == Rgb::BLACK));
    }

    #[test]
    fn an_unchanged_frame_has_no_dirty_rows() {
        let frame = Frame::filled(KEYBOARD, Rgb::new(10, 20, 30));

        assert!(frame.rows_differing_from(&frame.clone()).is_empty());
    }

    #[test]
    fn only_the_rows_that_moved_are_dirty() {
        let previous = Frame::black(KEYBOARD);
        let mut next = previous.clone();
        next.set(3, 7, Rgb::new(255, 0, 0));
        next.set(8, 0, Rgb::new(0, 255, 0));

        // Two rows out of nine, so two round trips instead of nine.
        assert_eq!(next.rows_differing_from(&previous), vec![3, 8]);
    }

    #[test]
    fn a_changed_geometry_dirties_everything() {
        // The device was swapped, or reported a different matrix. Nothing about
        // the previous picture can be trusted.
        let previous = Frame::black(MOUSE);
        let next = Frame::black(KEYBOARD);

        assert_eq!(next.rows_differing_from(&previous).len(), 9);
    }

    #[test]
    fn scaling_dims_towards_black_and_clamps() {
        let colour = Rgb::new(200, 100, 0);

        assert_eq!(colour.scaled(1.0), colour);
        assert_eq!(colour.scaled(0.0), Rgb::BLACK);
        assert_eq!(colour.scaled(0.5), Rgb::new(100, 50, 0));
        // Above 1.0 must not wrap around and brighten into nonsense.
        assert_eq!(colour.scaled(4.0), colour);
    }

    #[test]
    fn the_average_of_one_colour_is_that_colour() {
        let frame = Frame::filled(KEYBOARD, Rgb::new(10, 20, 30));

        assert_eq!(frame.average(), Rgb::new(10, 20, 30));
    }

    #[test]
    fn a_bright_band_on_a_dark_field_averages_dim() {
        // What an "effects only" device is told about a wave. Reporting the
        // band's own colour would make a headset blaze while the keyboard it
        // sits beside is mostly dark.
        let mut frame = Frame::black(Geometry::new(1, 10));
        frame.set(0, 0, Rgb::new(255, 0, 0));

        assert_eq!(frame.average(), Rgb::new(25, 0, 0));
    }

    #[test]
    fn a_payload_declares_the_bounds_its_pixels_fill() {
        let payload = row_payload(2, &[Rgb::new(1, 2, 3), Rgb::new(4, 5, 6)]);

        // row 2, columns 0 to 1 inclusive, then the two triplets.
        assert_eq!(payload, vec![2, 0, 1, 1, 2, 3, 4, 5, 6]);
    }

    #[test]
    fn a_payload_is_three_bytes_plus_a_triplet_per_column() {
        let row = vec![Rgb::BLACK; 22];

        assert_eq!(row_payload(0, &row).len(), 3 + 22 * 3);
    }
}
