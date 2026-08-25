use std::sync::Arc;

use tokio::sync::Mutex;

use crate::capability::{TwinklyPool, TWINKLY_CATALOGUE};
use crate::razer::engine::ambience::Ambience;
use crate::razer::engine::cadence::Cadence;
use crate::razer::engine::frame::Rgb;
use crate::razer::engine::group::{Conductor, GroupError, GroupId, GroupStatus, ParticipantId};
use crate::razer::persistence;
use openrazer::backend::{BackendError, DeviceBackend};

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

    /// Every Twinkly a sweep has seen. Here rather than its own managed state
    /// because the engine needs it when a group starts: a strip participant is
    /// driven through the same handle — and the same session — its page uses.
    strips: Arc<TwinklyPool>,

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
        let (conductor, invented) =
            Self::initial_conductor(backend.as_ref(), config_path.as_deref()).await;

        let state = Self {
            backend,
            reason,
            conductor: Mutex::new(conductor),
            strips: Arc::new(TwinklyPool::default()),
            config_path,
        };

        if let Ok(backend) = state.backend_handle() {
            // ⚠️ At startup the pool is empty — no sweep has run — so a saved
            // group holding a strip reports it skipped until the group is
            // started again after the dashboard's first sweep.
            state
                .conductor
                .lock()
                .await
                .start_marked(Some(backend), &state.strips)
                .await;
        }

        // ⚠️ The first run has to write itself down.
        //
        // Everywhere else, saving happens because the user changed something.
        // A first run changes nothing — the "All devices" group is invented
        // here — so without this the file did not exist until the user
        // happened to rename a group or move a slider, and everything before
        // that was lost on quit. `next_id` went with it, which is worse than
        // losing a group: ids would be handed out again after a restart and a
        // reference the interface still held would address a different group.
        if invented {
            state.persist(&*state.conductor.lock().await);
        }

        state
    }

    /// The Twinklys, for the commands that talk to one and for discovery to
    /// fill.
    pub fn strips(&self) -> &TwinklyPool {
        &self.strips
    }

    /// The groups to start from, and whether they were **invented here** and
    /// so have never been written down.
    ///
    /// That second half is what tells `new` when to save. Only the first run
    /// with something to put in a group answers `true`: a restored file is
    /// already on disk, and a file that cannot be read must not be written
    /// over.
    async fn initial_conductor(
        backend: Option<&Arc<dyn DeviceBackend>>,
        config_path: Option<&std::path::Path>,
    ) -> (Conductor, bool) {
        match config_path.map(persistence::load) {
            Some(Ok(saved)) => (Conductor::restore(saved.groups, saved.next_id), false),

            // Nothing saved: the first run. Everything in one group, drawing.
            Some(Err(persistence::LoadError::Absent)) | None => {
                let participants = match backend {
                    Some(backend) => backend.list_devices().await.unwrap_or_default(),
                    None => Vec::new(),
                };
                if participants.is_empty() {
                    // ⚠️ Deliberately **not** saved, so this stays a first run.
                    // A machine with no daemon yet would otherwise write an
                    // empty file, and the welcome — everything in one group,
                    // already drawing — would be spent on nothing and never
                    // offered again once the hardware did arrive.
                    (Conductor::default(), false)
                } else {
                    (
                        Conductor::with_everything(participants, Ambience::still(DEFAULT_COLOUR)),
                        true,
                    )
                }
            }

            // A file that exists and cannot be read is not a first run. Start
            // with nothing rather than overwriting whatever is in there on the
            // next save — the user can still repair it by hand.
            Some(Err(error)) => {
                eprintln!("warn: {error}; starting with no groups and saving nothing");
                (Conductor::default(), false)
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

    /// Edit the groups and write them to disk.
    ///
    /// Every change saves. A crash between a change and a save would lose it,
    /// and there is no natural moment to batch on — the user closes the window
    /// rather than the application.
    ///
    /// ⚠️ **Private, and that is the point.** Three ways in reach this type —
    /// the window over Tauri's IPC, an assistant over MCP, and the command
    /// line — and each of them is a *translation* layer with no business
    /// building domain values. Left public, this was the hole through which
    /// they did: `create_group` existed twice, differently, within a single
    /// afternoon — the window taking a name, members and an ambience, the MCP
    /// server taking a name and hard-coding green.
    ///
    /// Every operation is a named method below. A caller that needs something
    /// new adds one here, where all three get it at once, rather than a closure
    /// only one of them has.
    async fn with_groups<T>(&self, edit: impl FnOnce(&mut Conductor) -> T) -> T {
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
        // ⚠️ No daemon means "no Razer devices", **not** "no participants".
        // This used to refuse outright, which on a machine with a light string
        // and no Razer hardware took the whole dashboard down with it: the
        // frontend read the groups and this in one go, so the refusal buried
        // the groups too and nothing could be created or filled.
        //
        // A live call that fails is still an error — that is a fault worth
        // surfacing, and a different thing from hardware that was never there.
        let all = match self.backend() {
            Ok(backend) => backend.list_devices().await?,
            Err(_) => Vec::new(),
        };

        let conductor = self.conductor.lock().await;
        Ok(conductor.unassigned(&all).into_iter().cloned().collect())
    }

    // ── discovery ─────────────────────────────────────────────────────────────

    /// What this specific participant can actually be asked to do.
    ///
    /// The question every per-device control has to ask before it renders.
    /// Not every device has DPI stages or a battery, and the difference is
    /// finer than the device's kind: introspected against the daemon, a
    /// Goliathus publishes the chroma interface **without `setWave`** and a
    /// Kraken publishes it without `setKeyRow`. A control offered from the
    /// interface alone answers `UnknownMethod` the moment it is used, which is
    /// worse than never offering it — the user has already tried by then.
    ///
    /// Answers the `type` names `run_capability` takes, so the interface can
    /// ask "may I send this?" in the same vocabulary it would send.
    pub async fn capabilities(&self, participant: &str) -> Result<Vec<String>, BackendError> {
        // ⚠️ The third place reading the participant prefix, after `darken`
        // here and `Runner::attach`. It belongs inside a Twinkly source rather
        // than in the façade — see the `Surface` design; this is deliberately
        // consistent with the two that exist rather than inventing a fourth
        // shape ahead of that refactor.
        if participant.starts_with("twinkly-") {
            // Asked for, so the pool is checked: a participant no sweep has
            // seen cannot be driven, and saying "these are its capabilities"
            // about something unreachable is a lie the interface would render
            // as a working panel.
            self.strips.device(participant).await?;
            return Ok(TWINKLY_CATALOGUE.iter().map(|c| (*c).to_string()).collect());
        }

        let methods = self.backend()?.supported_methods(participant).await?;
        Ok(openrazer::request::supported_from(&methods))
    }

    /// Make a group.
    pub async fn create_group(
        &self,
        name: impl Into<String>,
        members: Vec<ParticipantId>,
        ambience: Ambience,
    ) -> Result<GroupId, GroupError> {
        let name = name.into();
        self.with_groups(|conductor| conductor.create(name, members, ambience))
            .await
    }

    pub async fn rename_group(
        &self,
        id: GroupId,
        name: impl Into<String>,
    ) -> Result<(), GroupError> {
        let name = name.into();
        self.with_groups(|conductor| conductor.rename(id, name))
            .await
    }

    /// Change what a group shows. A running one absorbs this without a rebuild:
    /// every device keeps painting the same surface, only differently.
    pub async fn set_group_ambience(
        &self,
        id: GroupId,
        ambience: Ambience,
    ) -> Result<(), GroupError> {
        self.with_groups(|conductor| conductor.set_ambience(id, ambience))
            .await
    }

    /// Change how fast a group ticks. Applies on the next start — a runner
    /// cannot be retuned while it is going.
    pub async fn set_group_cadence(&self, id: GroupId, cadence: Cadence) -> Result<(), GroupError> {
        self.with_groups(|conductor| conductor.set_cadence(id, cadence))
            .await
    }

    /// Change who is in a group, and make a running one act on it.
    ///
    /// ⚠️ A rebuild, not a nudge. `set_ambience` can be pushed into a running
    /// engine because every device keeps painting the same surface; changing
    /// the membership changes **which devices are attached**, and there is no
    /// way to tell a running engine about one it never opened.
    ///
    /// This is the defect behind "I put the light string in a group and nothing
    /// happened": the group's record changed, the engine kept the members it
    /// was built with, and the strip was never asked to do anything.
    ///
    /// The cost is a blink on the devices that were already in the group. That
    /// is the honest price of the change, and cheaper than the alternative,
    /// which is a member that is in the list and dark.
    pub async fn set_group_members(
        &self,
        id: GroupId,
        members: Vec<ParticipantId>,
    ) -> Result<(), GroupError> {
        let mut conductor = self.conductor.lock().await;

        // Who is new here, before the list is replaced — a stopped group has to
        // be told to darken them, and one that was already a member is already
        // dark.
        let arriving: Vec<ParticipantId> = match conductor.group(id) {
            Some(group) => members
                .iter()
                .filter(|member| !group.members.contains(member))
                .cloned()
                .collect(),
            None => Vec::new(),
        };

        conductor.set_members(id, members)?;

        if conductor.is_running(id) {
            // ⚠️ The backend is optional here, and that is the point: a group
            // of light strings has nothing for the daemon to do, and demanding
            // one made the rebuild silently skip.
            let _ = conductor
                .start(id, self.backend.clone(), &self.strips)
                .await;
        } else {
            // ⚠️ A stopped group has no engine, so nothing would ever speak to
            // a device that has just joined one — it would sit there showing
            // whatever its previous group left it with. A participant's state
            // follows its group's, and a stopped group shows nothing.
            self.darken(&arriving).await;
        }

        self.persist(&conductor);
        Ok(())
    }

    /// Switch participants off, outside any engine.
    ///
    /// Used where there is no runner to do it: joining a stopped group. Best
    /// effort — a device that cannot be reached is one that is showing nothing
    /// anyway, as far as anyone can tell.
    async fn darken(&self, participants: &[ParticipantId]) {
        for participant in participants {
            if participant.starts_with("twinkly-") {
                if let Ok(device) = self.strips.device(participant).await {
                    let _ = device.set_mode(twinkly::Mode::Off).await;
                }
            } else if let Ok(backend) = self.backend() {
                let _ = backend.set_chroma_static(participant, 0, 0, 0).await;
            }
        }
    }

    /// Rebuild any running group that lists a participant it is not driving.
    ///
    /// ⚠️ The other half of "the effect does not apply". A device found *after*
    /// its group started was skipped when the engine attached, and an engine
    /// has no way to learn of one later — so a light string that appears on the
    /// network sits in a group's member list, dark, until something restarts
    /// it. This is that something, called after every sweep.
    ///
    /// Only groups that are both running and missing one of the named
    /// participants are touched: a rebuild blinks the devices already in the
    /// group, and doing it on every sweep would be a stutter every fifteen
    /// seconds.
    pub async fn adopt(&self, present: &[ParticipantId]) {
        let mut conductor = self.conductor.lock().await;

        let waiting: Vec<GroupId> = conductor
            .status()
            .iter()
            .filter(|status| status.group.started)
            .filter(|status| {
                status.group.members.iter().any(|member| {
                    present.contains(member)
                        && !status.devices.iter().any(|device| &device.serial == member)
                })
            })
            .map(|status| status.group.id)
            .collect();

        if waiting.is_empty() {
            return;
        }

        for id in waiting {
            let _ = conductor
                .start(id, self.backend.clone(), &self.strips)
                .await;
        }
        self.persist(&conductor);
    }

    /// Start a group.
    ///
    /// ⚠️ No daemon is **not** a reason to refuse. This used to take the
    /// backend or fail, so on a machine with a light string and no OpenRazer,
    /// pressing Run did nothing at all — the group could never start, and
    /// nothing could ever light the strip. A Razer member with no daemon is now
    /// reported as one participant that could not be driven, which is what the
    /// interface already knows how to show.
    pub async fn start_group(&self, id: GroupId) -> Result<(), BackendError> {
        let mut conductor = self.conductor.lock().await;
        conductor
            .start(id, self.backend.clone(), &self.strips)
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
    use openrazer::backend::dbus::DbusBackend;
    let backend = DbusBackend::new().await?;
    Ok(Arc::new(backend))
}

#[cfg(target_os = "windows")]
async fn create_platform_backend() -> Result<Arc<dyn DeviceBackend>, BackendError> {
    use openrazer::backend::rest::RestBackend;
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
