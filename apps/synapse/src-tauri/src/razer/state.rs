use std::sync::Arc;

use tokio::sync::Mutex;

use crate::razer::backend::{BackendError, DeviceBackend};
use crate::razer::engine::ambience::Ambience;
use crate::razer::engine::cadence::Cadence;
use crate::razer::engine::{Engine, Status};

/// Tauri managed state. Holds the platform backend behind a trait object
/// so all command handlers are platform-agnostic.
///
/// The backend is optional, and that is the point: a machine with no OpenRazer
/// daemon must still get a window. Construction used to return a `Result` that
/// `lib.rs` unwrapped, so the process died before any window existed — on every
/// machine without the daemon, which is most of them. The failure is carried
/// here instead and surfaces as a `DaemonUnavailable` on the first command.
///
/// The engine sits beside it, behind a lock because Tauri hands commands a
/// `&RazerState` and starting or stopping it mutates. A `tokio::sync::Mutex`
/// rather than a `std` one: stopping awaits every runner, and holding a
/// blocking lock across an await would block the whole runtime.
///
/// `Send + Sync` are required by Tauri's `manage()`.
pub struct RazerState {
    /// `Arc`, not `Box`: every runner the engine spawns holds one, and a task
    /// cannot borrow from this struct.
    backend: Option<Arc<dyn DeviceBackend>>,

    /// Why there is none, kept verbatim for the message the frontend receives.
    reason: Option<String>,

    engine: Mutex<Option<Engine>>,
}

impl RazerState {
    /// Never fails. Called once at app startup in `lib.rs`.
    ///
    /// ⚠️ One attempt, at startup. A daemon started afterwards is not picked
    /// up — the app has to be restarted. Reconnecting on demand needs interior
    /// mutability here and is deliberately left out for now.
    ///
    /// The engine is lodged, not started. Launch will start whatever the saved
    /// configuration says was running — see `Conductor::start_marked` — and a
    /// machine with no saved configuration gets one group holding everything,
    /// already drawing.
    ///
    /// ⚠️ That default does light the hardware without being asked, overwriting
    /// whatever effect was on it. A deliberate choice, taken on the grounds
    /// that an application opening on an empty page teaches nothing, and
    /// reversible in one click since `started` is a state the user owns.
    pub async fn new() -> Self {
        match create_platform_backend().await {
            Ok(backend) => Self {
                backend: Some(backend),
                reason: None,
                engine: Mutex::new(None),
            },
            Err(error) => {
                eprintln!("warn: no device backend — {error}");
                Self {
                    backend: None,
                    reason: Some(error.to_string()),
                    engine: Mutex::new(None),
                }
            }
        }
    }

    /// The backend, or the reason there is not one. Every command goes through
    /// this rather than reaching for the field.
    pub fn backend(&self) -> Result<&dyn DeviceBackend, BackendError> {
        self.backend.as_deref().ok_or_else(|| self.unavailable())
    }

    fn backend_handle(&self) -> Result<Arc<dyn DeviceBackend>, BackendError> {
        self.backend.clone().ok_or_else(|| self.unavailable())
    }

    fn unavailable(&self) -> BackendError {
        BackendError::DaemonUnavailable(self.reason.clone().unwrap_or_else(|| "unknown".into()))
    }

    // ── the engine ────────────────────────────────────────────────────────────

    /// Starts drawing an ambience on every device the daemon reports.
    ///
    /// Replaces whatever was running, stopping it first so two engines never
    /// paint the same device at once — each would keep undoing the other, and
    /// the dirty-row memory of both would be wrong.
    pub async fn start_ambience(
        &self,
        ambience: Ambience,
        cadence: Cadence,
    ) -> Result<Status, BackendError> {
        let backend = self.backend_handle()?;
        let serials = backend.list_devices().await?;

        let mut slot = self.engine.lock().await;
        if let Some(running) = slot.take() {
            running.stop().await;
        }

        let engine = Engine::start(backend, &serials, ambience, cadence).await;
        let status = engine.status();
        *slot = Some(engine);
        Ok(status)
    }

    /// Stops drawing. The devices keep showing the last frame — nothing turns
    /// them off, because the user asked to stop an ambience, not to go dark.
    pub async fn stop_ambience(&self) {
        if let Some(running) = self.engine.lock().await.take() {
            running.stop().await;
        }
    }

    /// Changes what is being drawn, without restarting anything.
    ///
    /// Fails if nothing is running: silently starting would hide a caller that
    /// forgot to, and would paint devices the user had not asked to light.
    pub async fn set_ambience(&self, ambience: Ambience) -> Result<(), BackendError> {
        match self.engine.lock().await.as_ref() {
            Some(engine) => {
                engine.set_ambience(ambience);
                Ok(())
            }
            None => Err(BackendError::Protocol(
                "no ambience is running; start one first".into(),
            )),
        }
    }

    /// What the engine is doing, or `None` when it is not running.
    pub async fn ambience_status(&self) -> Option<Status> {
        self.engine.lock().await.as_ref().map(Engine::status)
    }

    pub async fn is_drawing(&self) -> bool {
        self.engine.lock().await.is_some()
    }
}

// ─── Platform selection ───────────────────────────────────────────────────────

#[cfg(target_os = "linux")]
async fn create_platform_backend() -> Result<Arc<dyn DeviceBackend>, BackendError> {
    use crate::razer::backend::dbus::DbusBackend;
    let backend = DbusBackend::new().await?;
    Ok(Arc::new(backend))
}

#[cfg(target_os = "windows")]
async fn create_platform_backend() -> Result<Arc<dyn DeviceBackend>, BackendError> {
    use crate::razer::backend::rest::RestBackend;
    // Base URL can come from config, env var, or a fixed default
    let base_url =
        std::env::var("RAZER_API_URL").unwrap_or_else(|_| "http://localhost:8080".into());
    Ok(Arc::new(RestBackend::new(base_url)))
}

// Fallback for other platforms (macOS, etc.) — fails loudly at startup
#[cfg(not(any(target_os = "linux", target_os = "windows")))]
async fn create_platform_backend() -> Result<Arc<dyn DeviceBackend>, BackendError> {
    Err(BackendError::Transport(
        "Unsupported platform — only Linux (DBus) and Windows (REST) are implemented".into(),
    ))
}
