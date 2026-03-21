fn main() {
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR not set");

    let config = tauri_typegen::interface::config::GenerateConfig {
        project_path: manifest_dir.clone(),
        output_path: format!(
            "{}/../../../libs/backend-api/src/lib/generated",
            manifest_dir
        ),
        validation_library: "zod".to_string(),
        verbose: Some(true),
        ..Default::default()
    };

    tauri_typegen::interface::generate_from_config(&config)
        .expect("Failed to generate TypeScript bindings");

    tauri_build::build()
}
