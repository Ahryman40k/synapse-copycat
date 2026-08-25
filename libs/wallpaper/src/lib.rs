//! Set the desktop wallpaper on Linux.
//!
//! **A set of adapters, not a call.** There is no common way in: GNOME keeps it
//! in GSettings, KDE has no setting to write at all and takes a script the
//! shell evaluates, XFCE has one property per monitor *and* per workspace, and
//! the daemons used with tiling window managers each have their own client.
//!
//! So the shape here is: find which of them this machine actually has, and say
//! so. A control that silently does nothing on three desktops out of four is
//! worse than one that reports what it found.
//!
//! ⚠️ **What is testable here is which setter is chosen and what it would run.**
//! Running it is not: this machine has none of these desktops. The argv is
//! where the mistakes live anyway — the `file://` scheme GNOME wants and swww
//! does not, the dark variant that has to be written separately, the XFCE
//! property path that contains both a monitor and a workspace — and every one
//! of those has a test.

mod setters;

pub use setters::{available, Setter, Step};

use std::path::Path;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    /// Nothing on this machine knows how to set a wallpaper.
    #[error("no wallpaper setter found — tried {}", .tried.join(", "))]
    NoSetter { tried: Vec<String> },

    #[error("{setter} failed: {detail}")]
    Failed { setter: String, detail: String },

    #[error("{0} is not a file")]
    NotAFile(String),
}

pub type Result<T> = std::result::Result<T, Error>;

/// Set the wallpaper, and say which setter did it.
///
/// The first available one wins, in the order `available` returns them — which
/// puts the desktop's own before the general-purpose tools, because a session
/// running GNOME should not have its wallpaper set behind GNOME's back.
pub fn set(path: &Path) -> Result<String> {
    if !path.is_file() {
        return Err(Error::NotAFile(path.display().to_string()));
    }

    let found = available();
    let Some(setter) = found.first() else {
        return Err(Error::NoSetter {
            tried: Setter::all().iter().map(|s| s.name().to_owned()).collect(),
        });
    };

    setter.apply(path)?;
    Ok(setter.name().to_owned())
}
