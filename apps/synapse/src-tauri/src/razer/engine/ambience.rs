//! An ambience: three channels, each fed by its own source.
//!
//! The reason this exists rather than a list of modes. A mode like "music" or
//! "circadian" owns the whole picture, so two of them cannot both be on and
//! something has to arbitrate. Split the picture into what actually varies —
//! **colour**, **motion**, **brightness** — and the conflict disappears: the
//! wallpaper can decide the hue while audio decides the movement and the hour
//! decides how bright it all is. Nothing has to win, because they are not
//! asking for the same thing.
//!
//! The composition is one line, and it is the whole idea:
//!
//! ```text
//! pixel(x, y, t) = colour(x, y, t) × motion(x, y, t) × brightness(t)
//! ```
//!
//! Colour says *what* hue, motion says *where* the light is at this instant as
//! a 0..1 intensity, brightness says *how much* overall.
//!
//! ⚠️ This is why the engine paints instead of asking the device for an effect.
//! A hardware effect like `setSpectrum` owns colour **and** motion together —
//! there is no way to keep its movement and impose the wallpaper's hue. Channel
//! composition is only possible frame by frame, which is what it costs.
//!
//! Pure throughout: no clock, no bus, no device. Time arrives as a parameter so
//! a test can ask for any instant it likes.
//!
//! **Over the wire**, each source is an object tagged by `type`, the same shape
//! `CapabilityRequest` already uses:
//!
//! ```json
//! { "colour":     { "type": "fixed", "rgb": "#00ff00" },
//!   "motion":     { "type": "wave", "lapsPerSecond": 0.5, "width": 0.2 },
//!   "brightness": { "type": "circadian", "day": 1.0, "night": 0.2 } }
//! ```
//!
//! Tagged rather than positional, so adding a source is an addition on both
//! sides rather than a renumbering; camelCase because the other side is
//! TypeScript; and `Duration` never appears — serde would write it as a
//! `{ secs, nanos }` pair, which is not a thing anyone wants to type.

use std::time::Duration;

use serde::{Deserialize, Serialize};

use super::frame::{Frame, Geometry, Rgb};

/// The instant a frame is being composed for.
///
/// `elapsed` drives motion; `day_fraction` drives anything that follows the
/// hour. Both are given rather than read, so composing is reproducible — the
/// same tick always yields the same frame.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Tick {
    /// Since the ambience started.
    pub elapsed: Duration,
    /// Midnight is 0.0, noon 0.5, the following midnight 1.0.
    pub day_fraction: f32,
}

impl Tick {
    pub fn at(seconds: f32) -> Self {
        Self {
            elapsed: Duration::from_secs_f32(seconds),
            day_fraction: 0.5,
        }
    }
}

/// Where the hue comes from.
///
/// ⚠️ Not `Copy`, unlike the other two channels: `Palette` carries a `Vec`.
/// That is what makes `Ambience` non-`Copy` too, and the reason a handful of
/// call sites clone where they used to copy.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ColourSource {
    /// One colour, chosen by the user or reported by a device.
    Fixed { rgb: Rgb },
    /// A hue sweep. The only source here that also implies movement, because
    /// the colour itself is what travels — motion still decides the shape.
    #[serde(rename_all = "camelCase")]
    Rainbow {
        /// Full turns of the colour wheel per second.
        turns_per_second: f32,
        /// How much of the wheel is visible across the matrix at once, in
        /// turns. 0 paints every LED the same hue.
        spread: f32,
    },
    /// A handful of colours, spread along the device and blended between.
    ///
    /// What an image gives you. Extracting a palette from a photograph and
    /// laying it across the desk is the whole point — and it is parametric like
    /// the other two, so the same palette reads on a 22-column keyboard, a
    /// 50-LED string and a mousemat with one LED, none of which knows the
    /// others exist. A pre-computed frame could not do that.
    ///
    /// It **wraps**: the last colour blends back into the first, so a band
    /// travelling round the device meets no seam.
    #[serde(rename_all = "camelCase")]
    Palette {
        /// In order. One colour paints everything; none paints nothing, which
        /// is refused at the boundary rather than drawn.
        colours: Vec<Rgb>,
        /// Full turns of the palette per second. 0 holds it still, which is
        /// what an image-derived palette usually wants — the mapping to the
        /// picture is the point, and drifting loses it.
        turns_per_second: f32,
    },
}

/// Where the movement comes from: a 0..1 intensity per pixel per instant.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum MotionSource {
    /// Everything lit, evenly. What "static" means.
    None,
    /// A band travelling along the columns.
    ///
    /// Both figures are **fractions of the device**, not columns, and that is
    /// the whole point once a group holds more than one shape. In columns, the
    /// same wave at 8 columns/second crosses a 14-column mouse in 1.75s, a
    /// 22-column keyboard in 2.75s and a 100-LED strip in 12.5s: three waves
    /// drifting apart, not one ambience. Normalised, they cross together and
    /// the band covers the same proportion of each.
    #[serde(rename_all = "camelCase")]
    Wave {
        /// Full crossings of the device per second.
        laps_per_second: f32,
        /// Width of the lit band, as a fraction of the device.
        width: f32,
    },
    /// The whole matrix breathing together.
    ///
    /// Milliseconds on the wire: a `Duration` would serialise as a
    /// `{ secs, nanos }` pair, which no interface wants to build.
    #[serde(rename_all = "camelCase")]
    Pulse {
        #[serde(with = "millis")]
        period: Duration,
    },
}

/// Where the overall level comes from.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum BrightnessSource {
    Fixed {
        level: f32,
    },
    /// Warm and low at night, full during the day. The two levels are the
    /// user's; the curve between them is a cosine, so there is no step at the
    /// boundary — a light that jumps at a fixed hour reads as a fault.
    Circadian {
        day: f32,
        night: f32,
    },
}

/// The three channels together.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Ambience {
    pub colour: ColourSource,
    pub motion: MotionSource,
    pub brightness: BrightnessSource,
}

impl Ambience {
    /// What "static, one colour" means in this model: no movement, no curve.
    pub fn still(colour: Rgb) -> Self {
        Self {
            colour: ColourSource::Fixed { rgb: colour },
            motion: MotionSource::None,
            brightness: BrightnessSource::Fixed { level: 1.0 },
        }
    }

    pub fn compose(&self, geometry: Geometry, tick: Tick) -> Frame {
        let mut frame = Frame::black(geometry);
        let level = self.brightness.level(tick);

        // Per column, then copied down the rows. Every source here varies along
        // the columns and not across them, so computing per pixel repeated the
        // same work once per row.
        //
        // Worth saying that this was **not** measurable: composing a 9x22 frame
        // is far below the noise beside the round trips that carry it. It is
        // kept for being the honest shape of the calculation, not for a speed
        // it did not deliver. Where the frame overhead actually goes is still
        // open; `tests/frame_budget.rs` rules out the proxy, which was the
        // obvious suspect.
        //
        // A source that ever varies by row — a ripple from a keypress, say —
        // ends this shortcut, and should be obvious enough when it arrives.
        let columns: Vec<Rgb> = (0..geometry.columns)
            .map(|column| {
                let hue = self.colour.at(column, geometry, tick);
                let intensity = self.motion.at(column, geometry, tick);
                hue.scaled(intensity * level)
            })
            .collect();

        for row in 0..geometry.rows {
            for (column, colour) in columns.iter().enumerate() {
                frame.set(row, column as u8, *colour);
            }
        }
        frame
    }
}

impl ColourSource {
    fn at(&self, column: u8, geometry: Geometry, tick: Tick) -> Rgb {
        match self {
            Self::Fixed { rgb } => *rgb,
            Self::Rainbow {
                turns_per_second,
                spread,
            } => {
                let across = if geometry.columns > 1 {
                    f32::from(column) / f32::from(geometry.columns - 1)
                } else {
                    0.0
                };
                let turn = tick.elapsed.as_secs_f32() * turns_per_second + across * spread;
                hue_to_rgb(turn.rem_euclid(1.0))
            }
            Self::Palette {
                colours,
                turns_per_second,
            } => palette_at(colours, *turns_per_second, column, geometry, tick),
        }
    }
}

/// Where a column lands in a palette that wraps.
///
/// Divided by the column count and not by one less — the same reason the wave
/// is. Positions then sit at 0, 1/n … (n-1)/n, so the step from the last column
/// back to the first is like every other and the blend does not hesitate once
/// a lap.
///
/// ⚠️ The blend is linear in sRGB. Between two nearby hues — which is what an
/// image gives — that is indistinguishable from anything better. Between two
/// opposite ones it passes through grey, because the straight line between
/// them in RGB goes near the middle of the cube. Interpolating in OKLab would
/// fix it and is not written: no palette in hand needs it yet, and guessing at
/// the shape of a fix is how unused code arrives.
fn palette_at(
    colours: &[Rgb],
    turns_per_second: f32,
    column: u8,
    geometry: Geometry,
    tick: Tick,
) -> Rgb {
    match colours.len() {
        // Refused at the boundary; drawn as black if it ever gets here, which
        // is at least visibly wrong rather than a panic.
        0 => Rgb::new(0, 0, 0),
        1 => colours[0],
        count => {
            let across = f32::from(column) / f32::from(geometry.columns.max(1));
            let drift = tick.elapsed.as_secs_f32() * turns_per_second;
            let position = (across + drift).rem_euclid(1.0) * count as f32;

            let first = position.floor() as usize % count;
            let second = (first + 1) % count;
            blend(colours[first], colours[second], position.fract())
        }
    }
}

/// Straight-line mix of two colours, `amount` from the first to the second.
fn blend(from: Rgb, to: Rgb, amount: f32) -> Rgb {
    let mix = |a: u8, b: u8| {
        (f32::from(a) + (f32::from(b) - f32::from(a)) * amount.clamp(0.0, 1.0)).round() as u8
    };
    Rgb::new(mix(from.r, to.r), mix(from.g, to.g), mix(from.b, to.b))
}

impl MotionSource {
    fn at(self, column: u8, geometry: Geometry, tick: Tick) -> f32 {
        match self {
            Self::None => 1.0,

            Self::Wave {
                laps_per_second,
                width,
            } => {
                let columns = f32::from(geometry.columns.max(1));
                // Divided by the column count, not by `columns - 1`: positions
                // then sit at 0, 1/n … (n-1)/n and the step from the last back
                // to the first is 1/n like every other. Spreading them 0..1
                // inclusive would make that one gap twice as wide, and the wave
                // would hesitate once per lap.
                let position = f32::from(column) / columns;
                let head = (tick.elapsed.as_secs_f32() * laps_per_second).rem_euclid(1.0);
                // Distance the short way round, so the band does not tear as it
                // wraps from the last column back to the first.
                let raw = (position - head).abs();
                let distance = raw.min(1.0 - raw);
                (1.0 - distance / width.max(f32::EPSILON)).clamp(0.0, 1.0)
            }

            Self::Pulse { period } => {
                let seconds = period.as_secs_f32().max(f32::EPSILON);
                let phase = tick.elapsed.as_secs_f32() / seconds;
                // Cosine rather than a triangle: a breath has no corners.
                (1.0 - (phase * std::f32::consts::TAU).cos()) / 2.0
            }
        }
    }
}

impl BrightnessSource {
    fn level(self, tick: Tick) -> f32 {
        match self {
            Self::Fixed { level } => level.clamp(0.0, 1.0),
            Self::Circadian { day, night } => {
                // Peaks at noon, bottoms at midnight.
                let noon = (1.0 - (tick.day_fraction * std::f32::consts::TAU).cos()) / 2.0;
                (night + (day - night) * noon).clamp(0.0, 1.0)
            }
        }
    }
}

/// `Duration` as whole milliseconds, because `{ secs, nanos }` is not a shape
/// an interface should have to build.
mod millis {
    use serde::{Deserialize, Deserializer, Serialize, Serializer};
    use std::time::Duration;

    pub fn serialize<S: Serializer>(value: &Duration, s: S) -> Result<S::Ok, S::Error> {
        (value.as_millis() as u64).serialize(s)
    }

    pub fn deserialize<'de, D: Deserializer<'de>>(d: D) -> Result<Duration, D::Error> {
        Ok(Duration::from_millis(u64::deserialize(d)?))
    }
}

/// A hue on the colour wheel, fully saturated. `turn` is 0..1.
///
/// Deliberately not the OKLCH machinery `libs/ui` uses for the interface. That
/// exists to keep text readable against a background, which is not a problem
/// LEDs have — here we want the most saturated colour the hardware can show.
fn hue_to_rgb(turn: f32) -> Rgb {
    let sector = turn * 6.0;
    let rising = ((sector.rem_euclid(1.0)) * 255.0) as u8;
    let falling = 255 - rising;

    match sector as u8 % 6 {
        0 => Rgb::new(255, rising, 0),
        1 => Rgb::new(falling, 255, 0),
        2 => Rgb::new(0, 255, rising),
        3 => Rgb::new(0, falling, 255),
        4 => Rgb::new(rising, 0, 255),
        _ => Rgb::new(255, 0, falling),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const KEYBOARD: Geometry = Geometry::new(9, 22);
    const MOUSE: Geometry = Geometry::new(1, 14);
    const SINGLE: Geometry = Geometry::new(1, 1);

    const RED: Rgb = Rgb::new(255, 0, 0);

    #[test]
    fn an_ambience_crosses_the_boundary_as_tagged_objects() {
        let ambience = Ambience {
            colour: ColourSource::Rainbow {
                turns_per_second: 0.2,
                spread: 1.0,
            },
            motion: MotionSource::Wave {
                laps_per_second: 0.5,
                width: 0.2,
            },
            brightness: BrightnessSource::Circadian {
                day: 1.0,
                night: 0.2,
            },
        };

        let json = serde_json::to_string(&ambience).unwrap();
        assert_eq!(
            json,
            r#"{"colour":{"type":"rainbow","turnsPerSecond":0.2,"spread":1.0},"#.to_owned()
                + r#""motion":{"type":"wave","lapsPerSecond":0.5,"width":0.2},"#
                + r#""brightness":{"type":"circadian","day":1.0,"night":0.2}}"#
        );
        assert_eq!(serde_json::from_str::<Ambience>(&json).unwrap(), ambience);
    }

    #[test]
    fn a_pulse_is_milliseconds_not_a_pair_of_numbers() {
        let ambience = Ambience {
            motion: MotionSource::Pulse {
                period: Duration::from_millis(2500),
            },
            ..Ambience::still(RED)
        };

        let json = serde_json::to_string(&ambience.motion).unwrap();
        assert_eq!(json, r#"{"type":"pulse","period":2500}"#);
        assert_eq!(
            serde_json::from_str::<MotionSource>(&json).unwrap(),
            ambience.motion
        );
    }

    #[test]
    fn a_still_ambience_paints_one_colour_everywhere() {
        let frame = Ambience::still(RED).compose(KEYBOARD, Tick::at(0.0));

        for row in 0..9 {
            assert!(frame.row(row).iter().all(|pixel| *pixel == RED));
        }
    }

    #[test]
    fn a_still_ambience_does_not_move() {
        let ambience = Ambience::still(RED);

        // Nothing to redraw between two instants — every row stays clean, which
        // is what makes a static ambience cost nothing to hold.
        let first = ambience.compose(KEYBOARD, Tick::at(0.0));
        let later = ambience.compose(KEYBOARD, Tick::at(9.5));
        assert!(later.rows_differing_from(&first).is_empty());
    }

    #[test]
    fn brightness_dims_without_touching_the_hue() {
        let ambience = Ambience {
            brightness: BrightnessSource::Fixed { level: 0.5 },
            ..Ambience::still(RED)
        };

        assert_eq!(
            ambience.compose(MOUSE, Tick::at(0.0)).get(0, 0),
            Rgb::new(128, 0, 0)
        );
    }

    #[test]
    fn circadian_is_lowest_at_midnight_and_highest_at_noon() {
        let ambience = Ambience {
            brightness: BrightnessSource::Circadian {
                day: 1.0,
                night: 0.2,
            },
            ..Ambience::still(Rgb::new(100, 100, 100))
        };
        let level = |day_fraction| {
            ambience
                .compose(
                    SINGLE,
                    Tick {
                        elapsed: Duration::ZERO,
                        day_fraction,
                    },
                )
                .get(0, 0)
                .r
        };

        assert_eq!(level(0.0), 20); // midnight
        assert_eq!(level(0.5), 100); // noon
                                     // And no step between them: dusk sits in the middle, not on one side.
        let dusk = level(0.75);
        assert!(dusk > 20 && dusk < 100, "dusk was {dusk}");
    }

    /// One crossing a second, a band covering a fifth of whatever it is on.
    const CROSSING: MotionSource = MotionSource::Wave {
        laps_per_second: 1.0,
        width: 0.2,
    };

    #[test]
    fn a_wave_lights_one_place_and_leaves_the_rest_dark() {
        let ambience = Ambience {
            motion: CROSSING,
            ..Ambience::still(RED)
        };

        let frame = ambience.compose(MOUSE, Tick::at(0.0));
        assert_eq!(frame.get(0, 0), RED, "the head starts at the near edge");
        assert_eq!(frame.get(0, 7), Rgb::BLACK, "the far side is dark");
    }

    #[test]
    fn a_wave_travels() {
        let ambience = Ambience {
            motion: CROSSING,
            ..Ambience::still(RED)
        };

        // Half a lap: the head is at the middle and the edge it left is dark.
        let later = ambience.compose(MOUSE, Tick::at(0.5));
        assert_eq!(later.get(0, 7), RED);
        assert_eq!(later.get(0, 0), Rgb::BLACK);
    }

    #[test]
    fn a_wave_wraps_without_tearing() {
        let ambience = Ambience {
            motion: CROSSING,
            ..Ambience::still(RED)
        };

        // Head just short of a full lap: the first column is its neighbour
        // going the short way round, so it must be lit. Measuring the distance
        // the long way would leave a dark seam once per lap.
        let frame = ambience.compose(MOUSE, Tick::at(0.95));
        assert!(frame.get(0, 0).r > 0, "the seam is dark");
    }

    /// The reason the wave is measured in fractions rather than columns.
    ///
    /// A group holds whatever the user puts in it — a keyboard, a mouse, a
    /// light strip — and one ambience across them has to look like one
    /// ambience. In columns it would not: the same 8 columns/second crosses a
    /// 14-column mouse in 1.75s and a 22-column keyboard in 2.75s, and the two
    /// drift apart within seconds.
    #[test]
    fn one_wave_reaches_the_same_place_on_devices_of_different_sizes() {
        let ambience = Ambience {
            motion: CROSSING,
            ..Ambience::still(RED)
        };

        // Where the brightest column sits, as a fraction of the device.
        let head_of = |geometry: Geometry, at: f32| {
            let frame = ambience.compose(geometry, Tick::at(at));
            let brightest = (0..geometry.columns)
                .max_by_key(|column| frame.get(0, *column).r)
                .unwrap();
            f32::from(brightest) / f32::from(geometry.columns)
        };

        for moment in [0.0, 0.25, 0.5, 0.75] {
            let mouse = head_of(MOUSE, moment);
            let keyboard = head_of(KEYBOARD, moment);
            // Within one column of the coarser device, which is as close as
            // two different resolutions can agree.
            assert!(
                (mouse - keyboard).abs() < 1.0 / 14.0,
                "at {moment}s the mouse is at {mouse} and the keyboard at {keyboard}"
            );
        }
    }

    #[test]
    fn a_pulse_breathes_between_dark_and_full() {
        let ambience = Ambience {
            motion: MotionSource::Pulse {
                period: Duration::from_secs(2),
            },
            ..Ambience::still(RED)
        };
        let red_at = |t| ambience.compose(SINGLE, Tick::at(t)).get(0, 0).r;

        assert_eq!(red_at(0.0), 0, "starts dark");
        assert_eq!(red_at(1.0), 255, "full at half a period");
        assert_eq!(red_at(2.0), 0, "dark again after a full one");
    }

    #[test]
    fn a_rainbow_spreads_across_the_matrix() {
        let ambience = Ambience {
            colour: ColourSource::Rainbow {
                turns_per_second: 0.0,
                spread: 1.0,
            },
            ..Ambience::still(RED)
        };

        let frame = ambience.compose(MOUSE, Tick::at(0.0));
        assert_ne!(
            frame.get(0, 0),
            frame.get(0, 7),
            "a spread rainbow cannot be one colour"
        );
    }

    #[test]
    fn the_channels_compose_rather_than_override() {
        // The point of the whole model: hue from one source, movement from a
        // second, level from a third, all at once.
        let ambience = Ambience {
            colour: ColourSource::Rainbow {
                turns_per_second: 0.2,
                spread: 1.0,
            },
            motion: MotionSource::Wave {
                laps_per_second: 0.5,
                width: 0.15,
            },
            brightness: BrightnessSource::Fixed { level: 0.5 },
        };

        let frame = ambience.compose(KEYBOARD, Tick::at(1.0));
        let lit: Vec<Rgb> = (0..22)
            .map(|column| frame.get(0, column))
            .filter(|pixel| *pixel != Rgb::BLACK)
            .collect();

        assert!(!lit.is_empty(), "the wave lit nothing");
        assert!(
            lit.len() < 22,
            "the wave lit everything, so it is not a wave"
        );
        // Halved by brightness, so nothing reaches full even at the head.
        assert!(lit.iter().all(|p| p.r <= 128 && p.g <= 128 && p.b <= 128));
    }

    #[test]
    fn a_single_led_still_gets_a_colour() {
        // A Goliathus is 1x1. A rainbow across it has nowhere to spread, and
        // dividing by `columns - 1` must not blow up.
        let ambience = Ambience {
            colour: ColourSource::Rainbow {
                turns_per_second: 1.0,
                spread: 1.0,
            },
            ..Ambience::still(RED)
        };

        assert_ne!(
            ambience.compose(SINGLE, Tick::at(0.25)).get(0, 0),
            Rgb::BLACK
        );
    }

    // ── palette ──────────────────────────────────────────────────────────────

    const BLUE: Rgb = Rgb::new(0, 0, 255);

    fn palette(colours: &[Rgb]) -> Ambience {
        Ambience {
            colour: ColourSource::Palette {
                colours: colours.to_vec(),
                turns_per_second: 0.0,
            },
            motion: MotionSource::None,
            brightness: BrightnessSource::Fixed { level: 1.0 },
        }
    }

    #[test]
    fn paints_a_single_palette_colour_everywhere() {
        let frame = palette(&[RED]).compose(Geometry::new(1, 8), Tick::at(0.0));

        for column in 0..8 {
            assert_eq!(frame.get(0, column), RED);
        }
    }

    #[test]
    fn spreads_a_palette_along_the_columns() {
        // Two colours over eight columns: the first is pure at column 0, and
        // the middle of the run is where the second is pure.
        let frame = palette(&[RED, BLUE]).compose(Geometry::new(1, 8), Tick::at(0.0));

        assert_eq!(frame.get(0, 0), RED);
        assert_eq!(frame.get(0, 4), BLUE);
    }

    #[test]
    fn blends_between_palette_colours() {
        // A quarter of the way is halfway from the first to the second.
        let frame = palette(&[RED, BLUE]).compose(Geometry::new(1, 8), Tick::at(0.0));
        let middle = frame.get(0, 2);

        assert!(middle.r > 100 && middle.r < 160, "{middle:?}");
        assert!(middle.b > 100 && middle.b < 160, "{middle:?}");
    }

    #[test]
    fn wraps_the_palette_without_a_seam() {
        // The last column is on its way back to the first colour, not stranded
        // on the last one — otherwise a band travelling round meets a step.
        let frame = palette(&[RED, BLUE]).compose(Geometry::new(1, 8), Tick::at(0.0));
        let last = frame.get(0, 7);

        assert!(
            last.r > 0,
            "the wrap never returns towards the first colour"
        );
        assert!(last.b > 0, "the wrap left the last colour too early");
    }

    #[test]
    fn holds_a_palette_still_at_zero_turns() {
        let ambience = palette(&[RED, BLUE]);
        let geometry = Geometry::new(1, 8);

        assert_eq!(
            ambience.compose(geometry, Tick::at(0.0)),
            ambience.compose(geometry, Tick::at(9.5))
        );
    }

    #[test]
    fn drifts_a_palette_when_asked() {
        let ambience = Ambience {
            colour: ColourSource::Palette {
                colours: vec![RED, BLUE],
                turns_per_second: 0.5,
            },
            ..palette(&[RED, BLUE])
        };
        let geometry = Geometry::new(1, 8);

        assert_ne!(
            ambience.compose(geometry, Tick::at(0.0)),
            ambience.compose(geometry, Tick::at(1.0))
        );
    }

    #[test]
    fn still_gives_a_single_cell_a_palette_colour() {
        // A Goliathus is one LED, and dividing by the column count must not
        // leave it black.
        let frame = palette(&[RED, BLUE]).compose(Geometry::new(1, 1), Tick::at(0.0));

        assert_ne!(frame.get(0, 0), Rgb::new(0, 0, 0));
    }

    #[test]
    fn composes_a_palette_with_the_other_channels() {
        // The point of the source: it is a colour, so every motion and every
        // brightness still applies to it.
        let ambience = Ambience {
            colour: ColourSource::Palette {
                colours: vec![RED, BLUE],
                turns_per_second: 0.0,
            },
            motion: MotionSource::Wave {
                laps_per_second: 1.0,
                width: 0.2,
            },
            brightness: BrightnessSource::Fixed { level: 0.5 },
        };
        let frame = ambience.compose(Geometry::new(1, 14), Tick::at(0.0));

        let lit: Vec<Rgb> = (0..14)
            .map(|column| frame.get(0, column))
            .filter(|colour| *colour != Rgb::new(0, 0, 0))
            .collect();

        assert!(!lit.is_empty(), "the wave put out the whole palette");
        assert!(lit.len() < 14, "the wave lit everything");
        for colour in lit {
            let brightest = colour.r.max(colour.g).max(colour.b);
            assert!(brightest <= 128, "brightness did not halve it: {colour:?}");
        }
    }
}
