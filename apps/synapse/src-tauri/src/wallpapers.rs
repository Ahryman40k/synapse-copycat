//! A folder of images, and the colours in them.
//!
//! The interface asks for a folder once; everything after that is derived. What
//! crosses the IPC is a thumbnail and a palette — never a path the webview
//! would have to load, because reading an arbitrary path from there means
//! opening the asset protocol to the whole filesystem, and the browser path has
//! no filesystem at all. One shape works in both.

use std::path::Path;

use serde::Serialize;
use specta::Type;
use tauri_plugin_dialog::DialogExt;

/// How many colours are pulled from each image.
///
/// Five is what a picture usually has to say. Fewer loses the accent that makes
/// it recognisable; more starts returning two shades of the same sky.
const PALETTE_SIZE: usize = 5;

/// What a wallpaper looks like to the interface.
#[derive(Debug, Clone, Serialize, Type)]
pub struct Wallpaper {
    /// The absolute path, which is what a desktop's wallpaper setter needs.
    /// Shown to nobody; the name is what a reader sees.
    pub path: String,
    pub name: String,
    /// `data:image/png;base64,…`, small enough to sit in a grid.
    pub thumbnail: String,
    /// `#rrggbb`, ordered by hue — they are laid along a device, so neighbours
    /// here are neighbours on the strip.
    pub palette: Vec<String>,
}

/// Extensions worth trying. Anything else in the folder is somebody's notes.
const IMAGES: &[&str] = &["jpg", "jpeg", "png", "webp", "gif", "bmp"];

/// Ask for a folder. `None` when the dialog was dismissed, which is not an
/// error and must not be reported as one.
pub fn choose_folder(app: &tauri::AppHandle) -> Option<String> {
    app.dialog()
        .file()
        .blocking_pick_folder()
        .and_then(|folder| folder.into_path().ok())
        .map(|path| path.display().to_string())
}

/// Every image in a folder, with its palette.
///
/// ⚠️ Not recursive. A wallpaper folder is a wallpaper folder; walking into
/// whatever else is under it turns "choose a folder" into "scan my home
/// directory", which is a different thing to consent to.
///
/// An image that cannot be read is skipped rather than failing the lot: one
/// truncated download must not empty the page.
pub fn wallpapers(folder: &str) -> Vec<Wallpaper> {
    let Ok(entries) = std::fs::read_dir(Path::new(folder)) else {
        eprintln!("warn: {folder} could not be read");
        return Vec::new();
    };

    let mut found: Vec<Wallpaper> = entries
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| path.is_file() && looks_like_an_image(path))
        .filter_map(|path| describe(&path))
        .collect();

    // By name, so the grid does not reshuffle itself between visits — the order
    // a directory hands back is the filesystem's business, not an order.
    found.sort_by_key(|wallpaper| wallpaper.name.to_lowercase());
    found
}

fn looks_like_an_image(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| IMAGES.contains(&extension.to_lowercase().as_str()))
        .unwrap_or(false)
}

fn describe(path: &Path) -> Option<Wallpaper> {
    let thumbnail = match palette::thumbnail(path) {
        Ok(thumbnail) => thumbnail,
        Err(error) => {
            eprintln!("warn: {} could not be read — {error}", path.display());
            return None;
        }
    };

    let colours = palette::extract(path, PALETTE_SIZE).unwrap_or_default();

    Some(Wallpaper {
        path: path.display().to_string(),
        name: path
            .file_stem()
            .and_then(|stem| stem.to_str())
            .unwrap_or("untitled")
            .to_owned(),
        thumbnail,
        palette: colours
            .into_iter()
            .map(|colour| format!("#{:02x}{:02x}{:02x}", colour.r, colour.g, colour.b))
            .collect(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn takes_only_things_that_could_be_images() {
        assert!(looks_like_an_image(Path::new("/a/b.JPG")));
        assert!(looks_like_an_image(Path::new("/a/b.png")));
        // Somebody's notes, and a folder named like one.
        assert!(!looks_like_an_image(Path::new("/a/notes.txt")));
        assert!(!looks_like_an_image(Path::new("/a/b")));
    }

    #[test]
    fn a_folder_that_is_not_there_is_empty_rather_than_fatal() {
        assert!(wallpapers("/definitely/not/here").is_empty());
    }
}
