mod commands;
mod razer;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub async fn run() {
    let state = razer::state::RazerState::new()
        .await
        .expect("Failed to initialise Razer backend");

    tauri::Builder::default()
        .setup(|app| {
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
        .invoke_handler(tauri::generate_handler![
            // commands::devices,
            // commands::modules,
            commands::run_capability,
            commands::list_devices,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
