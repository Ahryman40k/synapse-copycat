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

use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{App, AppHandle, Manager, RunEvent, WindowEvent};

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

/// Keeps the process alive when the last window goes.
///
/// Without this the engine stops the moment the window is closed, which is the
/// whole thing this module exists to prevent.
pub fn keep_running(event: &RunEvent) {
    if let RunEvent::ExitRequested { api, code, .. } = event {
        // `code` is `Some` when the exit was asked for in code — the tray's
        // Quit, through `app.exit(0)`. That one is honoured; a window closing
        // is not.
        if code.is_none() {
            api.prevent_exit();
        }
    }
}
