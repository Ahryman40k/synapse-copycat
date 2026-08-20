// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Not `#[tokio::main]`. Tauri owns the async runtime, and a plugin that builds
// its own — `single-instance` does, for DBus on Linux — panics with "cannot
// start a runtime from within a runtime" when this thread is already driving
// one. Anything async before the app starts goes through
// `tauri::async_runtime::block_on`.
fn main() {
    app_lib::run();
}
