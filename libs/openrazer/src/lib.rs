//! Talk to the OpenRazer daemon.
//!
//! **A protocol library, and nothing else.** It knows about the daemon's
//! interfaces — devices, matrices, DPI, brightness, battery — and nothing about
//! groups, ambiences or the application that drives them.
//!
//! One trait, two implementations, chosen at compile time: DBus on Linux and
//! the REST bridge on Windows. That split is the whole reason `DeviceBackend`
//! exists — every caller above it is written once.
//!
//! ⚠️ **A fake device says yes to everything.** `openrazer-fake.sh` in the
//! application's scripts runs the real daemon against OpenRazer's fake sysfs
//! tree, which proves the shape of the calls and the capability discovery — and
//! never the latency, the firmware, the wireless link, or what a frame actually
//! looks like.

pub mod backend;
pub mod capabilities;
pub mod capability;
pub mod dispatch;
pub mod request;

pub use backend::{BackendError, DeviceBackend};
pub use dispatch::dispatch;
pub use request::{CapabilityRequest, CapabilityResponse};
