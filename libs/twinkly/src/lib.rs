//! Discover and drive Twinkly LED devices over their local network API.
//!
//! **A protocol library, and nothing else.** It knows about strings of LEDs,
//! not about groups, ambiences or anything else this application happens to
//! build on top — the adapter that makes a Twinkly a participant lives in the
//! application, not here. That is what keeps this usable on its own and keeps
//! the abstraction over several protocols honest: it will be extracted from two
//! working implementations rather than guessed from one.
//!
//! ⚠️ **The protocol is not documented by the vendor.** Everything here comes
//! from the community's reverse engineering — <https://xled-docs.readthedocs.io>
//! — checked against a real device where it could be. Anything verified that
//! way says so at the point it matters; anything not verified is marked.
//!
//! ```no_run
//! # async fn example() -> twinkly::Result<()> {
//! use std::time::Duration;
//!
//! for found in twinkly::discover(Duration::from_secs(2)).await? {
//!     let device = twinkly::Device::new(found.address);
//!     let gestalt = device.gestalt().await?;
//!     println!("{} — {} LEDs", gestalt.device_name, gestalt.number_of_led);
//! }
//! # Ok(())
//! # }
//! ```

mod device;
mod discovery;
mod error;

pub use device::{Device, Gestalt, Mode};
pub use discovery::{decode_reply, discover, probe, Discovered};
pub use error::{Error, Result};
