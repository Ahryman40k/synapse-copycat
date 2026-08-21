use std::sync::Arc;

use tokio::sync::Mutex;

use crate::razer::backend::{BackendError, DeviceBackend};
use crate::razer::engine::ambience::Ambience;
use crate::razer::engine::frame::Rgb;
use crate::razer::engine::group::{Conductor, GroupId, GroupStatus, ParticipantId};
use crate::razer::persistence;

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
/// Razer green, and the same value `libs/ui` starts its palette from.
const DEFAULT_COLOUR: Rgb = Rgb::new(0, 255, 0);

pub struct RazerState {
    /// `Arc`, not `Box`: every runner the engine spawns holds one, and a task
    /// cannot borrow from this struct.
    backend: Option<Arc<dyn DeviceBackend>>,

    /// Why there is none, kept verbatim for the message the frontend receives.
    reason: Option<String>,

    conductor: Mutex<Conductor>,

    /// Where the groups are written. `None` when neither `XDG_CONFIG_HOME` nor
    /// `HOME` is set, in which case the app still runs — it just forgets.
    config_path: Option<std::path::PathBuf>,
}

impl RazerState {
    /// Never fails. Called once at app startup in `lib.rs`.
    ///
    /// ⚠️ One attempt at the daemon, at startup. A daemon started afterwards is
    /// not picked up — the app has to be restarted.
    ///
    /// Groups come from disk. With nothing saved, everything the daemon
    /// reports goes into one group that is already drawing; with a broken file,
    /// nothing is assumed and the user is left with no groups rather than with
    /// a configuration silently replaced.
    pub async fn new() -> Self {
        let (backend, reason) = match create_platform_backend().await {
            Ok(backend) => (Some(backend), None),
            Err(error) => {
                eprintln!("warn: no device backend — {error}");
                (None, Some(error.to_string()))
            }
        };

        let config_path = persistence::default_path();
        let conductor = Self::initial_conductor(backend.as_ref(), config_path.as_deref()).await;

        let state = Self {
            backend,
            reason,
            conductor: Mutex::new(conductor),
            config_path,
        };

        if let Ok(backend) = state.backend_handle() {
            state.conductor.lock().await.start_marked(backend).await;
        }
        state
    }

    async fn initial_conductor(
        backend: Option<&Arc<dyn DeviceBackend>>,
        config_path: Option<&std::path::Path>,
    ) -> Conductor {
        match config_path.map(persistence::load) {
            Some(Ok(saved)) => Conductor::restore(saved.groups, saved.next_id),

            // Nothing saved: the first run. Everything in one group, drawing.
            Some(Err(persistence::LoadError::Absent)) | None => {
                let participants = match backend {
                    Some(backend) => backend.list_devices().await.unwrap_or_default(),
                    None => Vec::new(),
                };
                if participants.is_empty() {
                    Conductor::default()
                } else {
                    Conductor::with_everything(participants, Ambience::still(DEFAULT_COLOUR))
                }
            }

            // A file that exists and cannot be read is not a first run. Start
            // with nothing rather than overwriting whatever is in there on the
            // next save — the user can still repair it by hand.
            Some(Err(error)) => {
                eprintln!("warn: {error}; starting with no groups and saving nothing");
                Conductor::default()
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

    /// Runs something against the groups and writes the result to disk.
    ///
    /// Every change saves. A crash between a change and a save would lose it,
    /// and there is no natural moment to batch on — the user closes the window
    /// rather than the application.
    pub async fn with_groups<T>(&self, edit: impl FnOnce(&mut Conductor) -> T) -> T {
        let mut conductor = self.conductor.lock().await;
        let outcome = edit(&mut conductor);
        self.persist(&conductor);
        outcome
    }

    fn persist(&self, conductor: &Conductor) {
        let Some(path) = &self.config_path else {
            return;
        };
        if let Err(error) = persistence::save(path, &persistence::snapshot(conductor)) {
            // Not fatal: the ambience is running, and losing it on the next
            // launch is better than taking the window down now.
            eprintln!("warn: could not save groups to {}: {error}", path.display());
        }
    }

    // ── groups ────────────────────────────────────────────────────────────────

    pub async fn groups(&self) -> Vec<GroupStatus> {
        self.conductor.lock().await.status()
    }

    /// Everything the daemon reports that no group has claimed.
    pub async fn unassigned(&self) -> Result<Vec<ParticipantId>, BackendError> {
        let all = self.backend()?.list_devices().await?;
        let conductor = self.conductor.lock().await;
        Ok(conductor.unassigned(&all).into_iter().cloned().collect())
    }

    /// Starts a group. Separate from `with_groups` because it needs the
    /// backend and is `async` all the way down.
    pub async fn start_group(&self, id: GroupId) -> Result<(), BackendError> {
        let backend = self.backend_handle()?;
        let mut conductor = self.conductor.lock().await;
        conductor
            .start(id, backend)
            .await
            .map_err(|error| BackendError::Protocol(error.to_string()))?;
        self.persist(&conductor);
        Ok(())
    }

    pub async fn stop_group(&self, id: GroupId) {
        let mut conductor = self.conductor.lock().await;
        conductor.stop(id).await;
        self.persist(&conductor);
    }

    pub async fn remove_group(&self, id: GroupId) -> Result<(), BackendError> {
        let mut conductor = self.conductor.lock().await;
        conductor
            .remove(id)
            .await
            .map_err(|error| BackendError::Protocol(error.to_string()))?;
        self.persist(&conductor);
        Ok(())
    }

    /// Stops everything. For a real quit, so the devices are not left being
    /// driven by a process that is going away.
    pub async fn stop_all(&self) {
        self.conductor.lock().await.stop_all().await;
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
