//! Where the groups live between two runs.
//!
//! Without this, "started" means nothing past a restart and every launch is a
//! first launch. It is also what `Conductor::start_marked` exists to restore.
//!
//! JSON at `$XDG_CONFIG_HOME/synapse/groups.json`, falling back to
//! `~/.config/synapse/`. Written by hand-rolled path logic rather than a
//! crate: it is a dozen lines, and Tauri's own `app_config_dir` needs an
//! `AppHandle` that does not exist yet when the state is built.

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use super::engine::group::{Conductor, Group, GroupId};

/// The file's shape.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Saved {
    /// Bumped when the shape changes in a way an older file cannot satisfy.
    /// Present from the first version precisely so there is somewhere to put
    /// the answer later.
    pub version: u32,

    /// Carried, not recomputed. Ids handed to the interface must not be reused
    /// after a group is deleted, or a stale reference would quietly address
    /// somebody else's group.
    #[serde(rename = "nextId")]
    pub next_id: GroupId,

    pub groups: Vec<Group>,
}

pub const VERSION: u32 = 1;

#[derive(Debug)]
pub enum LoadError {
    /// No file yet. The ordinary case on a first run, not a fault.
    Absent,
    /// There is a file and it cannot be understood. Deliberately distinct from
    /// `Absent`: silently starting fresh would throw away a configuration the
    /// user can still repair by hand.
    Unreadable(String),
    /// Written by a newer version of the app.
    TooNew(u32),
}

impl std::fmt::Display for LoadError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Absent => write!(f, "no saved groups"),
            Self::Unreadable(why) => write!(f, "saved groups could not be read: {why}"),
            Self::TooNew(version) => {
                write!(
                    f,
                    "saved groups are version {version}, this app reads {VERSION}"
                )
            }
        }
    }
}

/// `$XDG_CONFIG_HOME/synapse/groups.json`, or `~/.config/synapse/groups.json`.
pub fn default_path() -> Option<PathBuf> {
    let base = std::env::var_os("XDG_CONFIG_HOME")
        .map(PathBuf::from)
        .filter(|path| path.is_absolute())
        .or_else(|| std::env::var_os("HOME").map(|home| PathBuf::from(home).join(".config")))?;
    Some(base.join("synapse").join("groups.json"))
}

pub fn load(path: &Path) -> Result<Saved, LoadError> {
    let text = match std::fs::read_to_string(path) {
        Ok(text) => text,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            return Err(LoadError::Absent)
        }
        Err(error) => return Err(LoadError::Unreadable(error.to_string())),
    };

    let saved: Saved =
        serde_json::from_str(&text).map_err(|error| LoadError::Unreadable(error.to_string()))?;

    if saved.version > VERSION {
        return Err(LoadError::TooNew(saved.version));
    }
    Ok(saved)
}

/// Writes through a temporary file in the same directory, then renames.
///
/// A half-written config is worse than none: it loses the groups *and* reports
/// itself as corrupt on the next launch. Renaming within one filesystem is
/// atomic, so a crash mid-write leaves the previous file intact.
pub fn save(path: &Path, saved: &Saved) -> std::io::Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let text = serde_json::to_string_pretty(saved)?;

    let temporary = path.with_extension("json.tmp");
    std::fs::write(&temporary, text)?;
    std::fs::rename(&temporary, path)
}

pub fn snapshot(conductor: &Conductor) -> Saved {
    Saved {
        version: VERSION,
        next_id: conductor.next_id_value(),
        groups: conductor.groups().to_vec(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::razer::engine::ambience::Ambience;
    use crate::razer::engine::frame::Rgb;

    fn a_saved_file() -> Saved {
        let mut conductor = Conductor::default();
        conductor
            .create(
                "Desk",
                vec!["kbd".into()],
                Ambience::still(Rgb::new(1, 2, 3)),
            )
            .unwrap();
        snapshot(&conductor)
    }

    fn temporary_dir() -> PathBuf {
        let dir = std::env::temp_dir().join(format!("synapse-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn a_saved_configuration_comes_back_the_same() {
        let path = temporary_dir().join("roundtrip.json");
        let saved = a_saved_file();

        save(&path, &saved).unwrap();

        assert_eq!(load(&path).unwrap(), saved);
        std::fs::remove_file(path).ok();
    }

    #[test]
    fn a_missing_file_is_not_a_fault() {
        // The ordinary first run. Distinct from a broken file, because one
        // means "start fresh" and the other means "do not throw this away".
        let path = temporary_dir().join("nothing-here.json");
        std::fs::remove_file(&path).ok();

        assert!(matches!(load(&path), Err(LoadError::Absent)));
    }

    #[test]
    fn a_broken_file_is_reported_rather_than_ignored() {
        let path = temporary_dir().join("broken.json");
        std::fs::write(&path, "{ this is not json").unwrap();

        assert!(matches!(load(&path), Err(LoadError::Unreadable(_))));
        std::fs::remove_file(path).ok();
    }

    #[test]
    fn a_file_from_a_newer_app_is_refused_not_guessed_at() {
        let path = temporary_dir().join("from-the-future.json");
        let mut saved = a_saved_file();
        saved.version = VERSION + 1;
        save(&path, &saved).unwrap();

        // Reading it with today's rules could silently drop fields the newer
        // version cares about, and then write them away on the next save.
        assert!(matches!(load(&path), Err(LoadError::TooNew(_))));
        std::fs::remove_file(path).ok();
    }

    #[test]
    fn saving_leaves_no_temporary_behind() {
        let path = temporary_dir().join("clean.json");
        save(&path, &a_saved_file()).unwrap();

        assert!(!path.with_extension("json.tmp").exists());
        std::fs::remove_file(path).ok();
    }

    #[test]
    fn the_next_id_survives_a_save() {
        // Ids handed out to the interface must never be reused: a stale
        // reference would address somebody else's group.
        let mut conductor = Conductor::default();
        let first = conductor
            .create("A", vec!["kbd".into()], Ambience::still(Rgb::BLACK))
            .unwrap();
        conductor
            .create("B", vec!["mouse".into()], Ambience::still(Rgb::BLACK))
            .unwrap();

        let saved = snapshot(&conductor);
        let restored = Conductor::restore(saved.groups.clone(), saved.next_id);

        assert!(restored.group(first).is_some());
        assert_eq!(saved.next_id, 2);
    }

    #[test]
    fn the_path_sits_under_the_xdg_config_home() {
        // Only that it is chosen from the environment rather than hardcoded;
        // which of the two variables wins depends on the machine running this.
        let path = default_path().expect("neither XDG_CONFIG_HOME nor HOME is set");

        assert!(path.ends_with("synapse/groups.json"), "{path:?}");
        assert!(path.is_absolute());
    }
}
