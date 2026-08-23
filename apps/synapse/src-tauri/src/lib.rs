pub mod capability;
mod commands;
mod discovery;
mod lifecycle;
pub mod razer;
mod watch;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Synchronous on purpose — see `main.rs`. Tauri's own runtime drives this
    // one await, so no second runtime is ever created.
    //
    // Never `expect` here: a missing daemon must not cost the user their
    // window. The state carries the failure and every command reports it.
    let state = tauri::async_runtime::block_on(razer::state::RazerState::new());

    tauri::Builder::default()
        // Must be registered first: it decides whether this process is the one
        // that runs at all. A second launch hands its arguments here and dies,
        // which is what makes relaunching the binary a way back to the window
        // — the reliable one where there is no system tray.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            lifecycle::reveal(app);
        }))
        .setup(|app| {
            lifecycle::install(app)?;

            // Hotplug, forwarded for the window's whole life. The Twinkly
            // poller is not spawned here: the frontend owns that preference
            // and asserts it through `watch_twinkly` once it has read it.
            watch::spawn_razer(app.handle().clone());

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .manage(state)
        .manage(watch::TwinklyWatch::default())
        .invoke_handler(tauri::generate_handler![
            commands::devices,
            commands::twinkly_devices,
            commands::watch_twinkly,
            // commands::modules,
            commands::run_capability,
            // ── groups ──
            commands::groups,
            commands::unassigned_participants,
            commands::create_group,
            commands::rename_group,
            commands::set_group_members,
            commands::set_group_ambience,
            commands::set_group_cadence,
            commands::start_group,
            commands::stop_group,
            commands::remove_group,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        // `run` rather than the builder's, so the exit can be refused: closing
        // the last window must not take the engine with it.
        .run(|_app, event| lifecycle::keep_running(&event));
}
