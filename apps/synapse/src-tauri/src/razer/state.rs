use crate::razer::backend::{BackendError, DeviceBackend};

/// Tauri managed state. Holds the platform backend behind a trait object
/// so all command handlers are platform-agnostic.
///
/// `Send + Sync` are required by Tauri's `manage()`.
pub struct RazerState {
    pub backend: Box<dyn DeviceBackend>,
}

impl RazerState {
    /// Construct the correct backend for the current platform.
    /// Called once at app startup in main.rs.
    pub async fn new() -> Result<Self, BackendError> {
        let backend = create_platform_backend().await?;
        Ok(Self { backend })
    }
}

// ─── Platform selection ───────────────────────────────────────────────────────

#[cfg(target_os = "linux")]
async fn create_platform_backend() -> Result<Box<dyn DeviceBackend>, BackendError> {
    use crate::razer::backend::dbus::DbusBackend;
    let backend = DbusBackend::new().await?;
    Ok(Box::new(backend))
}

#[cfg(target_os = "windows")]
async fn create_platform_backend() -> Result<Box<dyn DeviceBackend>, BackendError> {
    use crate::razer::backend::rest::RestBackend;
    // Base URL can come from config, env var, or a fixed default
    let base_url = std::env::var("RAZER_API_URL")
        .unwrap_or_else(|_| "http://localhost:8080".into());
    Ok(Box::new(RestBackend::new(base_url)))
}

// Fallback for other platforms (macOS, etc.) — fails loudly at startup
#[cfg(not(any(target_os = "linux", target_os = "windows")))]
async fn create_platform_backend() -> Result<Box<dyn DeviceBackend>, BackendError> {
    Err(BackendError::Transport(
        "Unsupported platform — only Linux (DBus) and Windows (REST) are implemented".into(),
    ))
}
