//! Staying alive with no window.
//!
//! An ambience that stops when the window closes is not an ambience, it is a
//! preview. The engine runs in this process, so the process has to outlive the
//! window — which by default it does not: Tauri exits when the last one goes.
//!
//! Three ways back in, on purpose. **Never make the tray the only door**:
//! Hyprland has no system tray of its own, and neither do the other tiling
//! compositors — the icon comes from a status bar implementing
//! StatusNotifierItem, typically Waybar. A user without one would have hidden
//! their window with no way to bring it back.
//!
//!   - the tray icon, where there is a tray
//!   - relaunching the binary, which reveals the running instance
//!   - the window's own close button only hides it, so it is never gone by
//!     accident

use std::time::Duration;

use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{App, AppHandle, Manager, RunEvent, WindowEvent};

use crate::razer::state::RazerState;

/// The window Tauri creates from `tauri.conf.json`.
const MAIN: &str = "main";

/// Brings the window back, creating nothing: it was hidden, not destroyed.
///
/// ⚠️ Hidden, which keeps the WebKitGTK webview resident — on the order of a
/// hundred megabytes for a window opened three times a day. Closing it instead
/// would free that and cost a rebuild on every reveal. Worth revisiting once
/// there is a reason to care; noted here so the choice is a choice.
pub fn reveal(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// Hides on close instead of destroying, and wires the tray.
pub fn install(app: &App) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window(MAIN) {
        let handle = app.handle().clone();
        window.on_window_event(move |event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // The user closed a window, not the application. Quitting is
                // the tray's Quit, which is the only thing that means it.
                api.prevent_close();
                if let Some(window) = handle.get_webview_window(MAIN) {
                    let _ = window.hide();
                }
            }
        });
    }

    install_tray(app.handle())
}

fn install_tray(app: &AppHandle) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Show Synapse", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().cloned().ok_or_else(|| {
            tauri::Error::AssetNotFound("no default window icon to use in the tray".into())
        })?)
        .tooltip("Synapse")
        .menu(&menu)
        // The menu is for the right button; a left click should just open the
        // window, which is what everyone expects and nobody reads a menu for.
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => reveal(app),
            // The one path that really exits. Everything else hides.
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;

    Ok(())
}

/// What an exit request turns out to mean.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Exiting {
    /// A window went away. The application has not — and neither has the
    /// ambience, which is the whole thing this module exists to prevent.
    Refuse,
    /// Somebody really asked to quit. Stop the devices before the process that
    /// is driving them disappears.
    Quiesce,
}

/// Whether an exit request is the real thing.
///
/// `code` is `Some` only when the exit was asked for in code, which here means
/// the tray's Quit through `app.exit(0)`. A window closing carries none.
///
/// Split out from the event so the rule can be tested: `RunEvent` and its
/// `ExitRequestApi` cannot be built outside Tauri, and the decision is the
/// part worth pinning.
pub const fn exiting(code: Option<i32>) -> Exiting {
    match code {
        Some(_) => Exiting::Quiesce,
        None => Exiting::Refuse,
    }
}

/// Keeps the process alive when the last window goes, and stops the devices
/// when it is genuinely going.
pub fn keep_running(app: &AppHandle, event: &RunEvent) {
    let RunEvent::ExitRequested { api, code, .. } = event else {
        return;
    };

    match exiting(*code) {
        Exiting::Refuse => api.prevent_exit(),
        Exiting::Quiesce => quiesce(app),
    }
}

/// How long quitting waits for the devices to be told to stop.
///
/// Bounded on purpose. Stopping lets each runner finish its frame and then
/// darken its device, which is device I/O — so a wedged daemon or a strip that
/// has left the network could otherwise make Quit the one button that appears
/// to do nothing. Long enough for several groups of real devices, short enough
/// that giving up still feels like quitting.
const QUIESCE: Duration = Duration::from_secs(5);

/// Stops every group before the process goes.
///
/// ⚠️ Without this, Quit left every device showing the last frame a process
/// that no longer exists had painted: lit hardware, and nothing still running
/// that could turn it off. `RazerState::stop_all` was written for exactly this
/// and was wired to nothing — it is `pub`, so it never showed up as dead code.
///
/// The groups keep their `started` flag and nothing is saved here, so the next
/// launch resumes them. Quitting the application and switching an ambience off
/// are two different requests, the same way stopping a group and darkening it
/// are.
fn quiesce(app: &AppHandle) {
    let state = app.state::<RazerState>();

    // The event loop thread is not a runtime worker — `lib.rs` already blocks
    // on it once at startup — so the runners keep being driven while this
    // waits for them.
    let stopped = tauri::async_runtime::block_on(async move {
        tokio::time::timeout(QUIESCE, state.stop_all()).await
    });

    if stopped.is_err() {
        eprintln!("warn: the devices did not stop within {QUIESCE:?}; some may be left lit");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn closing_a_window_is_not_quitting() {
        // The close button hides; the engine keeps running. A window carries
        // no exit code precisely because nobody asked for one.
        assert_eq!(exiting(None), Exiting::Refuse);
    }

    #[test]
    fn quitting_stops_the_devices_first() {
        // ⚠️ The tray's Quit is `app.exit(0)`, and zero is a code like any
        // other — read as "no code" it would leave the application unable to
        // exit at all.
        assert_eq!(exiting(Some(0)), Exiting::Quiesce);
        assert_eq!(exiting(Some(1)), Exiting::Quiesce);
    }
}
