use crate::razer::backend::{BackendError, DeviceBackend};

/// Tauri managed state. Holds the platform backend behind a trait object
/// so all command handlers are platform-agnostic.
///
/// The backend is optional, and that is the point: a machine with no OpenRazer
/// daemon must still get a window. Construction used to return a `Result` that
/// `lib.rs` unwrapped, so the process died before any window existed — on every
/// machine without the daemon, which is most of them. The failure is carried
/// here instead and surfaces as a `DaemonUnavailable` on the first command.
///
/// `Send + Sync` are required by Tauri's `manage()`.
pub struct RazerState {
    backend: Option<Box<dyn DeviceBackend>>,

    /// Why there is none, kept verbatim for the message the frontend receives.
    reason: Option<String>,
}

impl RazerState {
    /// Never fails. Called once at app startup in `lib.rs`.
    ///
    /// ⚠️ One attempt, at startup. A daemon started afterwards is not picked
    /// up — the app has to be restarted. Reconnecting on demand needs interior
    /// mutability here and is deliberately left out for now.
    pub async fn new() -> Self {
        match create_platform_backend().await {
            Ok(backend) => Self {
                backend: Some(backend),
                reason: None,
            },
            Err(error) => {
                eprintln!("warn: no device backend — {error}");
                Self {
                    backend: None,
                    reason: Some(error.to_string()),
                }
            }
        }
    }

    /// The backend, or the reason there is not one. Every command goes through
    /// this rather than reaching for the field.
    pub fn backend(&self) -> Result<&dyn DeviceBackend, BackendError> {
        self.backend.as_deref().ok_or_else(|| {
            BackendError::DaemonUnavailable(
                self.reason.clone().unwrap_or_else(|| "unknown".into()),
            )
        })
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
