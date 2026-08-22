//! What the application does with Razer hardware.
//!
//! The daemon client itself lives in `libs/openrazer` — this is the part that
//! is about *this* application: the wire shape the frontend receives, the
//! rendering engine, the groups and where they are saved.
//!
//! ⚠️ The engine still names `openrazer::DeviceBackend` as what it paints
//! through, which is a coupling to one protocol and not the end state. The
//! abstraction that replaces it will be extracted once a second protocol can
//! actually be driven — from two working implementations rather than guessed
//! from one.

pub mod device;
pub mod engine;
pub mod persistence;
pub mod state;
