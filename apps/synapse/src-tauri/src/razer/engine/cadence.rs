//! How often the engine redraws.
//!
//! Three speeds rather than a number, because the number is not the user's
//! business and the right one depends on hardware they cannot see. What they
//! choose between is how alive the lighting feels against what it costs.

use std::time::Duration;

use serde::{Deserialize, Serialize};

/// A requested redraw rate. **A request, not a promise** — see `Achieved`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Cadence {
    /// 10 Hz. Enough for anything that breathes, fades or follows the hour, and
    /// almost free: a nine-row keyboard spends under 8% of its budget here.
    Slow,

    /// 30 Hz. The default, and the measurement says why — a 9x22 keyboard takes
    /// 7.8ms of a 33ms budget, leaving room for the rest of a setup and for
    /// real hardware being slower than the fake it was measured on.
    #[default]
    Normal,

    /// 60 Hz. Smooth, and marginal. That same keyboard needs 7.8ms of a 16.7ms
    /// budget and so *just* clears the headroom rule — but that 7.8ms is the
    /// generous upper bound, measured against a fake device writing a file
    /// where a real one goes on to a USB report the firmware must accept. 1.2ms
    /// more and it is gone. Comfortable on a mouse, a gamble on a keyboard, and
    /// the engine measures rather than guesses which.
    Fast,
}

impl Cadence {
    pub const fn hertz(self) -> u32 {
        match self {
            Self::Slow => 10,
            Self::Normal => 30,
            Self::Fast => 60,
        }
    }

    pub const fn budget(self) -> Duration {
        Duration::from_nanos(1_000_000_000 / self.hertz() as u64)
    }

    /// The next slower speed, or `None` at the bottom.
    ///
    /// For offering the user a gentler setting. The engine itself does not use
    /// it: a device that cannot keep up skips ticks of its own accord rather
    /// than slowing the group down — see `Achieved::draw_every`.
    pub const fn slower(self) -> Option<Self> {
        match self {
            Self::Fast => Some(Self::Normal),
            Self::Normal => Some(Self::Slow),
            Self::Slow => None,
        }
    }
}

/// What a cadence actually cost, once tried.
///
/// The engine measures rather than assumes, because the honest answer varies by
/// device: the same ambience is nine round trips on a keyboard and two on a
/// mouse. A caller can show this, or step down.
#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Achieved {
    pub requested: Cadence,
    /// Mean time to draw one frame, sending only the rows that moved.
    ///
    /// Milliseconds on the wire, as a float: an interface shows "12.4ms", not
    /// a `{ secs, nanos }` pair.
    #[serde(rename = "perFrameMs", serialize_with = "as_millis")]
    pub per_frame: Duration,
    pub frames: u32,
    /// How many ticks pass between draws. 1 is every tick.
    pub every: u32,
}

impl Achieved {
    /// Whether the work fits in the interval it has to fit in.
    ///
    /// Half the budget, not all of it: a device is never alone. Four devices
    /// painted in sequence would each need a quarter, and even in parallel the
    /// bus is shared. Filling the budget exactly means dropping frames the
    /// moment anything else happens.
    pub fn keeps_up(&self) -> bool {
        self.per_frame * 2 <= self.requested.budget()
    }

    pub fn effective_hertz(&self) -> f64 {
        f64::from(self.requested.hertz()) / f64::from(self.every.max(1))
    }

    /// How often this device should draw, in ticks, to stay inside its share.
    ///
    /// A device that cannot afford every tick takes every second or fourth
    /// instead. It does not fall behind by doing so: a frame is a pure function
    /// of the instant, so one drawn at t=0.4 shows the state at t=0.4 — not a
    /// stale frame from t=0.2. A slow strip and a fast keyboard in the same
    /// group stay in step, one simply sampling the ambience less often.
    ///
    /// Slowing the whole group to its slowest member was the alternative, and
    /// it is worse: it costs the keyboard its smoothness to spare the strip.
    pub fn draw_every(&self) -> u32 {
        if self.frames == 0 || self.per_frame.is_zero() {
            return 1;
        }
        // Doubled for the same reason `keeps_up` halves the budget: a device
        // shares the bus, and filling its interval exactly leaves nothing.
        let needed = self.per_frame.as_secs_f64() * 2.0 / self.requested.budget().as_secs_f64();
        (needed.ceil() as u32).max(1)
    }
}

fn as_millis<S: serde::Serializer>(value: &Duration, s: S) -> Result<S::Ok, S::Error> {
    s.serialize_f64(value.as_secs_f64() * 1000.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_default_is_the_one_that_was_measured() {
        assert_eq!(Cadence::default(), Cadence::Normal);
        assert_eq!(Cadence::Normal.hertz(), 30);
        assert_eq!(Cadence::Normal.budget(), Duration::from_nanos(33_333_333));
    }

    #[test]
    fn stepping_down_stops_at_the_bottom() {
        assert_eq!(Cadence::Fast.slower(), Some(Cadence::Normal));
        assert_eq!(Cadence::Normal.slower(), Some(Cadence::Slow));
        assert_eq!(Cadence::Slow.slower(), None, "slow is the floor");
    }

    #[test]
    fn keeping_up_means_leaving_room_for_the_other_devices() {
        // 7.8ms is the measured cost of a 9x22 keyboard.
        let keyboard = |requested| Achieved {
            requested,
            per_frame: Duration::from_micros(7_800),
            frames: 100,
            every: 1,
        };

        assert!(keyboard(Cadence::Slow).keeps_up());
        assert!(keyboard(Cadence::Normal).keeps_up(), "30Hz is the target");

        // And 60Hz *just* clears the margin: 7.8ms doubled is 15.6ms against a
        // 16.7ms budget. The rule is per device and this is the last one that
        // fits — a second keyboard, or the same one on real hardware rather
        // than a fake that only writes a file, does not.
        assert!(keyboard(Cadence::Fast).keeps_up());
        let slower_hardware = Achieved {
            requested: Cadence::Fast,
            per_frame: Duration::from_micros(9_000),
            frames: 100,
            every: 1,
        };
        assert!(!slower_hardware.keeps_up(), "1.2ms more and 60Hz is gone");
    }

    #[test]
    fn a_mouse_has_room_to_spare_where_a_keyboard_is_at_the_edge() {
        // 1.3ms measured, two round trips instead of ten — 8% of a 60Hz
        // budget, against the keyboard's 47%.
        let mouse = Achieved {
            requested: Cadence::Fast,
            per_frame: Duration::from_micros(1_300),
            frames: 100,
            every: 1,
        };

        assert!(mouse.keeps_up());
    }

    #[test]
    fn a_device_that_fits_draws_every_tick() {
        let keyboard = Achieved {
            requested: Cadence::Normal,
            per_frame: Duration::from_micros(7_800),
            frames: 100,
            every: 1,
        };

        assert_eq!(keyboard.draw_every(), 1);
    }

    #[test]
    fn a_device_that_cannot_keep_up_takes_every_fourth_tick() {
        // A light strip over WiFi: 50ms a frame against a 33ms interval. It is
        // not made to wait for the group, and the group is not slowed to it.
        let strip = Achieved {
            requested: Cadence::Normal,
            per_frame: Duration::from_millis(50),
            frames: 20,
            every: 1,
        };

        assert_eq!(strip.draw_every(), 4);
        let settled = Achieved { every: 4, ..strip };
        assert_eq!(settled.effective_hertz(), 7.5);
    }

    #[test]
    fn nothing_measured_yet_means_draw_every_tick() {
        let fresh = Achieved {
            requested: Cadence::Normal,
            per_frame: Duration::ZERO,
            frames: 0,
            every: 1,
        };

        assert_eq!(fresh.draw_every(), 1);
    }

    #[test]
    fn the_effective_rate_never_exceeds_the_one_asked_for() {
        // Drawing faster than the cadence does not make it run faster; the
        // engine waits. A still ambience sends nothing and would otherwise
        // report an absurd number.
        let idle = Achieved {
            requested: Cadence::Slow,
            per_frame: Duration::from_micros(1),
            frames: 100,
            every: 1,
        };

        assert_eq!(idle.effective_hertz(), 10.0);
    }
}
