//! Pull a small palette out of an image.
//!
//! **Not one average.** Averaging a photograph gives mud: a sunset and a forest
//! both come out brown-grey, because the mean of many colours sits near the
//! middle of the space whatever went in. What is wanted is the handful of
//! colours a person would name looking at the picture.
//!
//! So: **a splitting cut, in OKLab**.
//!
//! - *Splitting* rather than k-means because it is **deterministic**. k-means
//!   needs seeding, and a palette that comes out different on the second run is
//!   one nobody can write a test against.
//! - ⚠️ It splits at the widest **gap**, not at the median. Textbook median cut
//!   halves each box by population, which tears a cluster in two when the
//!   picture holds as many colours as were asked for — see `cut`.
//! - *OKLab* rather than RGB because distance in RGB is not distance to an eye.
//!   Two greens a camera separates by a wide RGB margin can be
//!   indistinguishable, while two blues a person tells apart at a glance sit
//!   close together. Cutting on the wrong axis gives five shades of sky and no
//!   sand.
//!
//! ```no_run
//! # fn example() -> palette::Result<()> {
//! let colours = palette::extract(std::path::Path::new("wall.jpg"), 5)?;
//! for colour in colours {
//!     println!("#{:02x}{:02x}{:02x}", colour.r, colour.g, colour.b);
//! }
//! # Ok(())
//! # }
//! ```

mod extract;
mod oklab;

pub use extract::{extract, extract_from, thumbnail, Rgb};

/// Everything that can go wrong reading an image.
#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("could not read {path}: {detail}")]
    Unreadable { path: String, detail: String },

    /// Asked for none, or for more than a palette means.
    #[error("a palette of {0} makes no sense")]
    Count(usize),
}

pub type Result<T> = std::result::Result<T, Error>;
