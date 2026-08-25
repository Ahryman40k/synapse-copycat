use std::path::Path;
use std::process::Command;

use crate::{Error, Result};

/// One command to run. Kept as data rather than run on the spot, so a test can
/// read what would happen without a desktop to happen on.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Step {
    pub program: String,
    pub args: Vec<String>,
}

impl Step {
    fn new(program: &str, args: &[String]) -> Self {
        Self {
            program: program.to_owned(),
            args: args.to_vec(),
        }
    }
}

/// Something that can put an image on the desktop.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Setter {
    /// GSettings. ⚠️ Two keys: writing only `picture-uri` means switching to a
    /// dark theme brings the old wallpaper back.
    Gnome,
    /// No setting to write. The shell evaluates a script over DBus.
    Kde,
    /// One property per monitor **and** per workspace, so the list has to be
    /// read before anything is written.
    Xfce,
    /// The daemon used with tiling window managers.
    Swww,
    /// Hyprland's own. Wants the image preloaded before it is shown.
    Hyprpaper,
    /// The fallback everyone has. Sets the root window and nothing else knows.
    Feh,
}

impl Setter {
    /// In the order they are preferred. A session's own desktop first: setting
    /// a GNOME wallpaper behind GNOME's back leaves the two disagreeing, and
    /// GNOME wins the next time it repaints.
    pub fn all() -> &'static [Setter] {
        &[
            Setter::Gnome,
            Setter::Kde,
            Setter::Xfce,
            Setter::Swww,
            Setter::Hyprpaper,
            Setter::Feh,
        ]
    }

    pub fn name(self) -> &'static str {
        match self {
            Setter::Gnome => "GNOME",
            Setter::Kde => "KDE Plasma",
            Setter::Xfce => "XFCE",
            Setter::Swww => "swww",
            Setter::Hyprpaper => "hyprpaper",
            Setter::Feh => "feh",
        }
    }

    /// The program that has to exist for this setter to be usable.
    pub fn program(self) -> &'static str {
        match self {
            Setter::Gnome => "gsettings",
            Setter::Kde => "qdbus",
            Setter::Xfce => "xfconf-query",
            Setter::Swww => "swww",
            Setter::Hyprpaper => "hyprctl",
            Setter::Feh => "feh",
        }
    }

    /// Whether the desktop this belongs to is the one running.
    ///
    /// ⚠️ Having the binary is not enough for the three desktop ones.
    /// `gsettings` is installed on machines that have never run GNOME — it
    /// comes with glib — and writing GNOME's key there changes nothing anyone
    /// can see. The general-purpose tools have no desktop to belong to, so for
    /// them the binary *is* the answer.
    fn belongs_to(self, desktop: &str) -> bool {
        let desktop = desktop.to_lowercase();
        match self {
            Setter::Gnome => {
                desktop.contains("gnome")
                    || desktop.contains("unity")
                    || desktop.contains("cinnamon")
            }
            Setter::Kde => desktop.contains("kde") || desktop.contains("plasma"),
            Setter::Xfce => desktop.contains("xfce"),
            Setter::Swww | Setter::Hyprpaper | Setter::Feh => true,
        }
    }

    /// What this setter would run for an image. Data, so it can be read.
    ///
    /// ⚠️ XFCE is absent on purpose: its property paths have to be read from
    /// the running desktop first, so there is no static answer. See
    /// `xfce_steps`.
    pub fn steps(self, path: &Path) -> Vec<Step> {
        let file = path.display().to_string();
        let uri = format!("file://{file}");

        match self {
            Setter::Gnome => vec![
                Step::new(
                    "gsettings",
                    &[
                        "set".into(),
                        "org.gnome.desktop.background".into(),
                        "picture-uri".into(),
                        uri.clone(),
                    ],
                ),
                // The dark variant, separately. Without it, switching theme
                // brings the previous wallpaper back and it looks like the
                // change was refused.
                Step::new(
                    "gsettings",
                    &[
                        "set".into(),
                        "org.gnome.desktop.background".into(),
                        "picture-uri-dark".into(),
                        uri,
                    ],
                ),
            ],

            Setter::Kde => vec![Step::new(
                "qdbus",
                &[
                    "org.kde.plasmashell".into(),
                    "/PlasmaShell".into(),
                    "org.kde.PlasmaShell.evaluateScript".into(),
                    kde_script(&file),
                ],
            )],

            // Read first, then one write per property — see `xfce_steps`.
            Setter::Xfce => Vec::new(),

            // A path, not a URI: swww takes the file and chokes on `file://`.
            Setter::Swww => Step::new("swww", &["img".into(), file]).into_one(),

            Setter::Hyprpaper => vec![
                // Preloaded first, or the second command has nothing to show.
                Step::new(
                    "hyprctl",
                    &["hyprpaper".into(), "preload".into(), file.clone()],
                ),
                Step::new(
                    "hyprctl",
                    &["hyprpaper".into(), "wallpaper".into(), format!(",{file}")],
                ),
            ],

            Setter::Feh => Step::new("feh", &["--bg-scale".into(), file]).into_one(),
        }
    }

    pub(crate) fn apply(self, path: &Path) -> Result<()> {
        let steps = if self == Setter::Xfce {
            xfce_steps(path)?
        } else {
            self.steps(path)
        };

        for step in steps {
            run(self, &step)?;
        }
        Ok(())
    }
}

impl Step {
    fn into_one(self) -> Vec<Step> {
        vec![self]
    }
}

/// The script KDE's shell evaluates. Every desktop, every container.
fn kde_script(file: &str) -> String {
    format!(
        "var all = desktops(); for (var i = 0; i < all.length; i++) {{ \
         var d = all[i]; d.wallpaperPlugin = 'org.kde.image'; \
         d.currentConfigGroup = ['Wallpaper', 'org.kde.image', 'General']; \
         d.writeConfig('Image', 'file://{file}'); }}"
    )
}

/// XFCE's writes, read from the desktop that is running.
///
/// ⚠️ One property per monitor and per workspace — `/backdrop/screen0/
/// monitorHDMI-1/workspace0/last-image` and one more for every other pair.
/// Writing a single hard-coded path changes one corner of one desktop, which
/// looks exactly like nothing happening.
fn xfce_steps(path: &Path) -> Result<Vec<Step>> {
    let listed = Command::new("xfconf-query")
        .args(["-c", "xfce4-desktop", "-l"])
        .output()
        .map_err(|error| Error::Failed {
            setter: Setter::Xfce.name().into(),
            detail: error.to_string(),
        })?;

    let file = path.display().to_string();
    Ok(xfce_properties(&String::from_utf8_lossy(&listed.stdout))
        .into_iter()
        .map(|property| {
            Step::new(
                "xfconf-query",
                &[
                    "-c".into(),
                    "xfce4-desktop".into(),
                    "-p".into(),
                    property,
                    "-s".into(),
                    file.clone(),
                ],
            )
        })
        .collect())
}

/// The image properties among everything `xfconf-query -l` prints.
fn xfce_properties(listing: &str) -> Vec<String> {
    listing
        .lines()
        .map(str::trim)
        .filter(|line| line.ends_with("/last-image"))
        .map(str::to_owned)
        .collect()
}

fn run(setter: Setter, step: &Step) -> Result<()> {
    let output = Command::new(&step.program)
        .args(&step.args)
        .output()
        .map_err(|error| Error::Failed {
            setter: setter.name().into(),
            detail: format!("{} — {error}", step.program),
        })?;

    if output.status.success() {
        return Ok(());
    }

    Err(Error::Failed {
        setter: setter.name().into(),
        // What it said, not just that it failed: these tools explain
        // themselves and the message is the whole diagnosis.
        detail: String::from_utf8_lossy(&output.stderr).trim().to_owned(),
    })
}

/// Which setters this machine can actually use, most appropriate first.
pub fn available() -> Vec<Setter> {
    let desktop = std::env::var("XDG_CURRENT_DESKTOP").unwrap_or_default();
    Setter::all()
        .iter()
        .copied()
        .filter(|setter| setter.belongs_to(&desktop) && on_path(setter.program()))
        .collect()
}

/// Whether a program is on `PATH`. Written out rather than shelling to `which`,
/// which is itself a program that may not be there.
fn on_path(program: &str) -> bool {
    let Ok(path) = std::env::var("PATH") else {
        return false;
    };

    std::env::split_paths(&path).any(|dir| dir.join(program).is_file())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn image() -> PathBuf {
        PathBuf::from("/home/you/Pictures/dusk.jpg")
    }

    #[test]
    fn gnome_writes_the_dark_variant_too() {
        // ⚠️ Without the second key, switching to a dark theme brings the
        // previous wallpaper back and the change looks refused.
        let steps = Setter::Gnome.steps(&image());

        assert_eq!(steps.len(), 2);
        assert!(steps[0].args.contains(&"picture-uri".to_owned()));
        assert!(steps[1].args.contains(&"picture-uri-dark".to_owned()));
    }

    #[test]
    fn gnome_wants_a_uri() {
        let steps = Setter::Gnome.steps(&image());

        assert!(
            steps[0]
                .args
                .last()
                .unwrap()
                .starts_with("file:///home/you/"),
            "{:?}",
            steps[0].args
        );
    }

    #[test]
    fn swww_wants_a_path_and_not_a_uri() {
        // The mirror mistake of the one above, and just as quiet: swww takes
        // the file and refuses a `file://` it cannot open.
        let steps = Setter::Swww.steps(&image());

        assert_eq!(steps[0].args, vec!["img", "/home/you/Pictures/dusk.jpg"]);
    }

    #[test]
    fn hyprpaper_preloads_before_it_shows() {
        // The second command has nothing to show otherwise.
        let steps = Setter::Hyprpaper.steps(&image());

        assert_eq!(steps.len(), 2);
        assert!(steps[0].args.contains(&"preload".to_owned()));
        assert_eq!(
            steps[1].args.last().unwrap(),
            ",/home/you/Pictures/dusk.jpg"
        );
    }

    #[test]
    fn kde_writes_every_desktop() {
        let steps = Setter::Kde.steps(&image());
        let script = steps[0].args.last().unwrap();

        assert!(script.contains("desktops()"), "{script}");
        assert!(
            script.contains("file:///home/you/Pictures/dusk.jpg"),
            "{script}"
        );
    }

    #[test]
    fn xfce_has_no_static_answer() {
        // Its properties have to be read from the running desktop first.
        assert!(Setter::Xfce.steps(&image()).is_empty());
    }

    #[test]
    fn xfce_takes_every_monitor_and_every_workspace() {
        // ⚠️ One property per pair. Writing a single hard-coded path changes
        // one corner of one desktop, which looks exactly like nothing happened.
        let listing = "\
/backdrop/screen0/monitorHDMI-1/workspace0/last-image
/backdrop/screen0/monitorHDMI-1/workspace0/image-style
/backdrop/screen0/monitorHDMI-1/workspace1/last-image
/backdrop/screen0/monitoreDP-1/workspace0/last-image
/backdrop/single-workspace-mode";

        let found = xfce_properties(listing);

        assert_eq!(found.len(), 3, "{found:?}");
        assert!(found
            .iter()
            .all(|property| property.ends_with("/last-image")));
    }

    #[test]
    fn a_desktop_tool_needs_its_desktop_to_be_running() {
        // ⚠️ `gsettings` ships with glib and is on machines that have never
        // run GNOME. Writing GNOME's key there changes nothing anyone can see,
        // so having the binary cannot be the test.
        assert!(Setter::Gnome.belongs_to("ubuntu:GNOME"));
        assert!(!Setter::Gnome.belongs_to("KDE"));
        assert!(Setter::Kde.belongs_to("KDE"));
        assert!(Setter::Xfce.belongs_to("XFCE"));
    }

    #[test]
    fn a_general_purpose_tool_belongs_to_no_desktop() {
        // swww and feh are used *instead* of a desktop, so there is nothing
        // for them to match — the binary being there is the whole answer.
        for setter in [Setter::Swww, Setter::Hyprpaper, Setter::Feh] {
            assert!(setter.belongs_to(""));
            assert!(setter.belongs_to("GNOME"));
        }
    }

    #[test]
    fn nothing_is_available_without_a_path() {
        // Not a case anyone meets, but it is what stops `on_path` from
        // reporting a program found in a directory named by an empty string.
        assert!(!on_path("definitely-not-a-program-anyone-has"));
    }
}
