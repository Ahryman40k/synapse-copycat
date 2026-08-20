mod commands;
pub mod razer;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub async fn run() {
    // Never `expect` here: a missing daemon must not cost the user their
    // window. The state carries the failure and every command reports it.
    let state = razer::state::RazerState::new().await;

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
            commands::devices,
            // commands::modules,
            commands::run_capability,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
