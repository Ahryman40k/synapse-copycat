//! The rendering engine: what to paint, what it costs, and who keeps painting.
//!
//! Composing colour, motion and brightness from independent sources means
//! drawing the matrix ourselves — a hardware effect owns colour and motion
//! together, so `setSpectrum` cannot keep its movement while taking the
//! wallpaper's hue. See `ambience`.
//!
//! **The budget.** Measured against a live daemon in `tests/frame_budget.rs`:
//! a frame costs one DBus round trip *per row*, ~700µs each, and the payload is
//! nearly free. A 9x22 keyboard is 7.8ms, a 1x14 mouse 1.3ms. Widening a row
//! from 2 to 22 columns cost 0.4ms; going from 1 row to 9 cost 6.4ms. So 30
//! frames a second is comfortable and 60 is not worth its cost on LEDs — and
//! the way to make a frame cheap is to send fewer rows, never smaller ones,
//! which is what `Frame::rows_differing_from` is for.
//!
//! That upper bound is generous: a fake device writes a file, a real one goes
//! on to a USB HID report the firmware has to accept.
//!
//! **The cadence is a request.** `Cadence` offers slow, normal and fast; the
//! engine measures what it actually achieved and can step down. 60Hz is
//! reachable on a mouse and not on a keyboard, and no amount of asking changes
//! that.
//!
//! **One task per device, not one loop over all of them.** Four devices painted
//! in sequence spend the sum of their costs inside a single interval — about
//! 13.5ms of a 33ms budget. Concurrently, the interval only has to cover the
//! slowest. See `runner`.
//!
//! **A group is an ambience and its participants**, and that is nearly what an
//! `Engine` already is. `group` adds the configuration around it — a name, a
//! started flag, and the rule that no participant belongs to two groups at
//! once, since two engines on one device would each keep undoing the other.
//!
//! **Two classes of device.** Painting assumes a matrix and `setKeyRow`. A
//! Kraken has neither — `hasMatrix` is false and the interface is absent — so a
//! headset can only ever run a hardware effect, and belongs to the ambience
//! through a single averaged colour instead.

pub mod ambience;
pub mod cadence;
pub mod frame;
pub mod group;
pub mod painter;
pub mod runner;

use std::sync::Arc;
use std::time::Duration;

use serde::Serialize;
use tokio::sync::watch;
use tokio::task::JoinHandle;

use openrazer::backend::DeviceBackend;

use crate::capability::TwinklyPool;

use ambience::Ambience;
use cadence::{Achieved, Cadence};
use runner::Runner;

/// One device the engine is driving, and how it is going.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceStatus {
    pub serial: String,
    /// False for a device the ambience is approximated on rather than drawn —
    /// a headset, or a mousemat that is one single LED.
    pub painted: bool,
    /// What the last second of drawing cost. `frames` is 0 until a second has
    /// passed, which is how "not measured yet" is told from a real figure.
    pub achieved: Achieved,
}

/// Everything a caller needs to show what the engine is doing.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    pub ambience: Ambience,
    pub cadence: Cadence,
    pub devices: Vec<DeviceStatus>,
    pub skipped: Vec<Skipped>,
}

/// A device the engine could not take on.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Skipped {
    pub serial: String,
    pub because: String,
}

struct Attached {
    serial: String,
    painted: bool,
    report: watch::Receiver<Achieved>,
    task: JoinHandle<()>,
}

/// Holds the ambience and the tasks drawing it.
///
/// One `watch` channel feeds every runner, so changing the ambience is one
/// send and no bookkeeping — and dropping the engine drops that sender, which
/// is how the tasks learn to stop. There is no way to leave one running.
pub struct Engine {
    ambience: watch::Sender<Ambience>,
    cadence: Cadence,
    attached: Vec<Attached>,
    skipped: Vec<Skipped>,
}

impl Engine {
    /// Attaches a runner to each device it can drive.
    ///
    /// A device that cannot be attached is recorded and skipped, never fatal: a
    /// peripheral unplugged between enumeration and here must not cost the user
    /// the ambience on everything else.
    pub async fn start(
        backend: Arc<dyn DeviceBackend>,
        strips: &TwinklyPool,
        serials: &[String],
        ambience: Ambience,
        cadence: Cadence,
    ) -> Self {
        let (sender, receiver) = watch::channel(ambience);
        let mut attached = Vec::new();
        let mut skipped = Vec::new();

        for serial in serials {
            match Runner::attach(backend.clone(), strips, serial.clone()).await {
                Ok(runner) => {
                    let painted = runner.is_painted();
                    // Seeded with a zero-frame figure rather than an Option: a
                    // caller reads `frames == 0` as "nothing measured yet", and
                    // the channel needs no relay task to wrap it.
                    let (report, watch_report) = watch::channel(Achieved {
                        requested: cadence,
                        per_frame: Duration::ZERO,
                        frames: 0,
                        every: 1,
                    });

                    let task = tokio::spawn(runner.run(receiver.clone(), cadence, Some(report)));
                    attached.push(Attached {
                        serial: serial.clone(),
                        painted,
                        report: watch_report,
                        task,
                    });
                }
                Err(error) => skipped.push(Skipped {
                    serial: serial.clone(),
                    because: error.to_string(),
                }),
            }
        }

        Self {
            ambience: sender,
            cadence,
            attached,
            skipped,
        }
    }

    /// Changes what every device is showing. One send, no per-device work.
    pub fn set_ambience(&self, ambience: Ambience) {
        // Fails only when every receiver is gone, which means every runner has
        // already stopped — nothing left to tell.
        let _ = self.ambience.send(ambience);
    }

    pub fn ambience(&self) -> Ambience {
        *self.ambience.borrow()
    }

    pub fn cadence(&self) -> Cadence {
        self.cadence
    }

    pub fn statuses(&self) -> Vec<DeviceStatus> {
        self.attached
            .iter()
            .map(|device| DeviceStatus {
                serial: device.serial.clone(),
                painted: device.painted,
                achieved: *device.report.borrow(),
            })
            .collect()
    }

    /// The devices that could not be driven, and why. Worth showing: a silent
    /// omission looks like a device the app failed to notice.
    pub fn skipped(&self) -> &[Skipped] {
        &self.skipped
    }

    pub fn device_count(&self) -> usize {
        self.attached.len()
    }

    pub fn status(&self) -> Status {
        Status {
            ambience: self.ambience(),
            cadence: self.cadence,
            devices: self.statuses(),
            skipped: self.skipped.clone(),
        }
    }

    /// Stops every runner and waits for them.
    ///
    /// Dropping the engine stops them too — the sender goes with it — but does
    /// not wait, so a caller that needs the devices quiet before doing
    /// something else should call this.
    pub async fn stop(self) {
        drop(self.ambience);
        for device in self.attached {
            let _ = device.task.await;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use frame::Rgb;

    /// No backend is needed to build one by hand, which is the point: the
    /// engine's own behaviour does not depend on there being devices.
    #[tokio::test]
    async fn an_engine_with_no_devices_still_holds_an_ambience() {
        // What the first run looks like before anything is plugged in: the
        // wizard has to let an ambience be chosen with nothing to show it on.
        let (sender, _receiver) = watch::channel(Ambience::still(Rgb::new(1, 2, 3)));
        let engine = Engine {
            ambience: sender,
            cadence: Cadence::Normal,
            attached: Vec::new(),
            skipped: Vec::new(),
        };

        assert_eq!(engine.device_count(), 0);
        assert!(engine.statuses().is_empty());

        engine.set_ambience(Ambience::still(Rgb::new(9, 9, 9)));
        assert_eq!(engine.ambience(), Ambience::still(Rgb::new(9, 9, 9)));
    }
}
