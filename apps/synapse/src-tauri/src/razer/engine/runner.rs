//! The loop: one device, redrawn until told to stop.
//!
//! One of these per device, each its own task. Not one loop over every device:
//! the cost is a round trip per row, so painting four devices in sequence
//! spends the sum of their costs inside a single interval — measured, about
//! 13.5ms of a 33ms budget for a keyboard, a keypad, a mouse and an accessory.
//! Concurrently they overlap and the interval only has to cover the slowest.
//!
//! Stopping is the ambience channel closing. Drop the sender and every runner
//! watching it finishes its frame and returns — no cancellation token to thread
//! through, and no way to leave one running by forgetting to signal it.

use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use tokio::sync::watch;
use tokio::time::{interval, MissedTickBehavior};

use openrazer::backend::{BackendError, DeviceBackend};

use super::ambience::{Ambience, Tick};
use super::cadence::{Achieved, Cadence};
use super::frame::{Frame, Geometry, Rgb};
use super::painter::{Canvas, Painter};

/// How a device is made to show an ambience.
enum Surface {
    /// A matrix: the ambience is drawn on it.
    Painted(Painter),

    /// No matrix, or one pixel of it. The ambience is averaged to a single
    /// colour and set as a static effect — see `Frame::average`. A Kraken
    /// belongs to the ambience this way or not at all.
    Approximated { showing: Option<Rgb> },
}

/// Where a runner's frames are composed for. Approximated devices still get a
/// frame, of one pixel, so the same compositor serves both.
const SINGLE: Geometry = Geometry::new(1, 1);

pub struct Runner {
    backend: Arc<dyn DeviceBackend>,
    serial: String,
    surface: Surface,
}

impl Runner {
    /// Asks the device what it can take, and prepares accordingly.
    pub async fn attach(
        backend: Arc<dyn DeviceBackend>,
        serial: impl Into<String>,
    ) -> Result<Self, BackendError> {
        let serial = serial.into();
        let canvas = Canvas::discover(backend.as_ref(), &serial).await?;

        let surface = match canvas.geometry() {
            // One pixel is a colour, not a picture. Painting it would cost a
            // round trip per frame to say what `setStatic` says once.
            Some(geometry) if geometry.can_hold_a_picture() => {
                Surface::Painted(Painter::new(serial.clone(), geometry))
            }
            _ => Surface::Approximated { showing: None },
        };

        Ok(Self {
            backend,
            serial,
            surface,
        })
    }

    pub fn geometry(&self) -> Geometry {
        match &self.surface {
            Surface::Painted(painter) => painter.geometry(),
            Surface::Approximated { .. } => SINGLE,
        }
    }

    pub fn is_painted(&self) -> bool {
        matches!(self.surface, Surface::Painted(_))
    }

    /// Redraws until the ambience channel closes.
    ///
    /// `report` receives what the cadence actually cost, refreshed about once a
    /// second. A caller can show it, or step the cadence down — the engine
    /// measures rather than promises, because the same ambience is ten round
    /// trips on a keyboard and two on a mouse.
    pub async fn run(
        mut self,
        mut ambience: watch::Receiver<Ambience>,
        cadence: Cadence,
        report: Option<watch::Sender<Achieved>>,
    ) {
        let mut ticker = interval(cadence.budget());
        // Falling behind must not turn into a burst of catch-up frames: on
        // LEDs, a dropped frame is invisible and a burst is a stutter.
        ticker.set_missed_tick_behavior(MissedTickBehavior::Skip);

        let started = Instant::now();
        let mut meter = Meter::default();
        let mut failures = 0u32;

        // How many ticks between draws. Raised when this device turns out not
        // to afford every one — see `Achieved::draw_every`. Never lowers the
        // group: the keyboard keeps its smoothness while the strip takes every
        // fourth tick, and both show the state at the instant they draw.
        let mut every = 1u32;
        let mut tick_number = 0u32;

        loop {
            ticker.tick().await;

            // The sender is gone: whoever owned the ambience has finished with
            // it, and so are we.
            if ambience.has_changed().is_err() {
                break;
            }
            let ambience_now = *ambience.borrow_and_update();

            tick_number = tick_number.wrapping_add(1);
            if every > 1 && tick_number % every != 0 {
                continue;
            }

            let began = Instant::now();
            let outcome = self.show(&ambience_now, started.elapsed()).await;
            meter.record(began.elapsed());

            match outcome {
                Ok(()) => failures = 0,
                Err(error) => {
                    failures += 1;
                    // What is on the device is now unknown, so the next frame
                    // must be sent whole rather than as a difference against a
                    // picture that may never have arrived.
                    self.forget();
                    eprintln!("warn: {} frame failed: {error}", self.serial);
                    if failures >= GIVE_UP_AFTER {
                        eprintln!("warn: {} stopped after {failures} failures", self.serial);
                        break;
                    }
                }
            }

            if let Some(achieved) = meter.due(cadence, every) {
                // Re-paced from what the last second actually cost, so a device
                // that gets slower — a strip on a busy network — backs off, and
                // one that recovers speeds up again.
                every = achieved.draw_every();
                if let Some(report) = &report {
                    let _ = report.send(Achieved { every, ..achieved });
                }
            }
        }
    }

    async fn show(&mut self, ambience: &Ambience, elapsed: Duration) -> Result<(), BackendError> {
        let tick = Tick {
            elapsed,
            day_fraction: day_fraction(),
        };

        match &mut self.surface {
            Surface::Painted(painter) => {
                let frame = ambience.compose(painter.geometry(), tick);
                painter.draw(self.backend.as_ref(), &frame).await?;
            }
            Surface::Approximated { showing } => {
                let colour = ambience.compose(SINGLE, tick).average();
                // Same idea as the dirty rows: an unchanged colour is a round
                // trip that would tell the device what it already shows.
                if *showing != Some(colour) {
                    self.backend
                        .set_chroma_static(&self.serial, colour.r, colour.g, colour.b)
                        .await?;
                    *showing = Some(colour);
                }
            }
        }
        Ok(())
    }

    fn forget(&mut self) {
        match &mut self.surface {
            Surface::Painted(painter) => painter.forget(),
            Surface::Approximated { showing } => *showing = None,
        }
    }
}

/// Consecutive failed frames before a runner gives up on its device.
///
/// A device can be unplugged mid-ambience, and a task retrying thirty times a
/// second forever would fill the log and hold a name that no longer resolves.
const GIVE_UP_AFTER: u32 = 30;

/// How often `Achieved` is refreshed.
const REPORT_EVERY: Duration = Duration::from_secs(1);

#[derive(Default)]
struct Meter {
    frames: u32,
    total: Duration,
    since: Option<Instant>,
}

impl Meter {
    fn record(&mut self, took: Duration) {
        self.since.get_or_insert_with(Instant::now);
        self.frames += 1;
        self.total += took;
    }

    /// The window's result, if a window has elapsed. Resets when it reports, so
    /// each figure describes the last second rather than all of history — a
    /// runner that recovers should look recovered.
    fn due(&mut self, requested: Cadence, every: u32) -> Option<Achieved> {
        let since = self.since?;
        if since.elapsed() < REPORT_EVERY || self.frames == 0 {
            return None;
        }
        let achieved = Achieved {
            requested,
            per_frame: self.total / self.frames,
            frames: self.frames,
            every,
        };
        *self = Self::default();
        Some(achieved)
    }
}

/// Where we are in the day, as 0.0 at midnight and 0.5 at noon.
///
/// ⚠️ UTC. A circadian ambience should follow the *local* hour, and doing that
/// needs a timezone this crate has no dependency for. Anyone east or west of
/// Greenwich gets their evening at the wrong time until it does.
fn day_fraction() -> f32 {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
        % 86_400;
    seconds as f32 / 86_400.0
}

/// Composes one frame without any device, for previewing an ambience.
///
/// The interface needs to show what an ambience looks like before anything is
/// plugged in, and during the first-run wizard there may be nothing to show it
/// on at all.
pub fn preview(ambience: &Ambience, geometry: Geometry, elapsed: Duration) -> Frame {
    ambience.compose(
        geometry,
        Tick {
            elapsed,
            day_fraction: day_fraction(),
        },
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_day_fraction_stays_inside_one_turn() {
        let now = day_fraction();

        assert!((0.0..1.0).contains(&now), "was {now}");
    }

    #[test]
    fn a_meter_reports_nothing_before_its_window_is_up() {
        let mut meter = Meter::default();
        meter.record(Duration::from_millis(5));

        assert!(meter.due(Cadence::Normal, 1).is_none());
    }

    #[test]
    fn a_meter_averages_the_frames_it_saw() {
        let mut meter = Meter::default();
        meter.record(Duration::from_millis(4));
        meter.record(Duration::from_millis(8));
        // Pretend the window has passed rather than sleeping through it.
        meter.since = Some(Instant::now() - REPORT_EVERY);

        let achieved = meter.due(Cadence::Normal, 1).expect("the window is up");
        assert_eq!(achieved.per_frame, Duration::from_millis(6));
        assert_eq!(achieved.frames, 2);
    }

    #[test]
    fn a_meter_forgets_the_window_it_just_reported() {
        let mut meter = Meter::default();
        meter.record(Duration::from_millis(4));
        meter.since = Some(Instant::now() - REPORT_EVERY);
        meter.due(Cadence::Normal, 1).unwrap();

        // A runner that recovers should look recovered, not be averaged
        // against the second it spent failing.
        assert_eq!(meter.frames, 0);
        assert!(meter.due(Cadence::Normal, 1).is_none());
    }
}
