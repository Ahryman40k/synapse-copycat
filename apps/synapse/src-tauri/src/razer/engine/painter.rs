//! Putting a frame on one device, and knowing what not to send.

use crate::razer::backend::{BackendError, DeviceBackend};

use super::frame::{row_payload, Frame, Geometry};

/// What a device can take.
///
/// Answered by `hasMatrix` and `getMatrixDimensions`, so it is a fact about the
/// hardware rather than a guess from its kind. A Kraken is a headset and has no
/// matrix; a Goliathus is a mousemat and has one, of exactly one pixel.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Canvas {
    /// Frames can be drawn on it.
    Matrix(Geometry),
    /// Hardware effects only. Not an error: a headset genuinely cannot take a
    /// picture, and the caller owes it an approximation instead.
    EffectsOnly,
}

impl Canvas {
    pub async fn discover(backend: &dyn DeviceBackend, serial: &str) -> Result<Self, BackendError> {
        if !backend.has_matrix(serial).await? {
            return Ok(Self::EffectsOnly);
        }
        let (rows, columns) = backend.matrix_dimensions(serial).await?;
        // A device can answer `true` and then report nothing usable. Believe
        // the dimensions, not the flag.
        if rows == 0 || columns == 0 {
            return Ok(Self::EffectsOnly);
        }
        Ok(Self::Matrix(Geometry::new(rows, columns)))
    }

    pub fn geometry(self) -> Option<Geometry> {
        match self {
            Self::Matrix(geometry) => Some(geometry),
            Self::EffectsOnly => None,
        }
    }
}

/// Draws frames on one device, remembering what is already there.
///
/// The memory is the whole point. A frame costs one round trip **per row**,
/// about 700µs each, and the payload is nearly free — measured in
/// `tests/frame_budget.rs`. So the way to make an ambience affordable is to
/// send only the rows that moved: a still one sends nothing at all after the
/// first frame, and a wave crossing a keyboard sends two or three rows out of
/// nine instead of all of them.
pub struct Painter {
    serial: String,
    geometry: Geometry,
    shown: Option<Frame>,
}

impl Painter {
    pub fn new(serial: impl Into<String>, geometry: Geometry) -> Self {
        Self {
            serial: serial.into(),
            geometry,
            shown: None,
        }
    }

    pub fn geometry(&self) -> Geometry {
        self.geometry
    }

    /// Sends the rows that changed, then shows them. Returns how many rows went
    /// out, which is the number worth watching: it is the frame's real cost.
    ///
    /// A frame identical to the one already up sends nothing — not even
    /// `setCustom`, which would be a round trip to redisplay what is displayed.
    pub async fn draw(
        &mut self,
        backend: &dyn DeviceBackend,
        frame: &Frame,
    ) -> Result<usize, BackendError> {
        if frame.geometry() != self.geometry {
            return Err(BackendError::Protocol(format!(
                "frame is {:?}, device {} is {:?}",
                frame.geometry(),
                self.serial,
                self.geometry
            )));
        }

        let dirty = match &self.shown {
            // Nothing known to be on the device: draw all of it. This is also
            // the path after an error, so a half-sent frame is never left half
            // corrected.
            None => (0..self.geometry.rows).collect(),
            Some(shown) => frame.rows_differing_from(shown),
        };

        if dirty.is_empty() {
            return Ok(0);
        }

        for row in &dirty {
            backend
                .set_key_row(&self.serial, row_payload(*row, frame.row(*row)))
                .await?;
        }
        backend.show_custom_frame(&self.serial).await?;

        // Only once the whole frame is up. Recording it earlier would let a
        // failed row be remembered as shown, and that row would then never be
        // redrawn — a permanent stripe of the wrong colour.
        self.shown = Some(frame.clone());
        Ok(dirty.len())
    }

    /// Forgets what is on the device, so the next frame is sent whole.
    ///
    /// For when something else has painted over us — a hardware effect, another
    /// client, or the daemon restoring persistence on startup.
    pub fn forget(&mut self) {
        self.shown = None;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_matrix_of_no_size_is_effects_only() {
        // `hasMatrix` can answer true where the dimensions say otherwise.
        assert_eq!(
            Canvas::Matrix(Geometry::new(9, 22)).geometry(),
            Some(Geometry::new(9, 22))
        );
        assert_eq!(Canvas::EffectsOnly.geometry(), None);
    }
}
