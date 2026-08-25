//! Live updates, pushed to the interface.
//!
//! Two very different sources behind one idea. OpenRazer *tells* us when a
//! device comes or goes — DBus signals, forwarded. A Twinkly tells nobody
//! anything, so the network is asked again on an interval — but only while
//! the interface says to: the sources switch promises that turning Twinkly
//! off stops the sweeps, and a poller the frontend cannot stop would break it.
//!
//! Either way the interface receives one Tauri event carrying the fresh list,
//! in exactly the shape the matching command answers — so the handler that
//! reads an event is the handler that reads a fetch.

use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::Mutex;

use crate::discovery::{self, TwinklyDevice};
use crate::razer::state::RazerState;

/// Carries what the `devices` command answers.
pub const DEVICES_CHANGED: &str = "devices_changed";

/// Carries what the `twinkly_devices` command answers.
pub const TWINKLY_DEVICES_CHANGED: &str = "twinkly_devices_changed";

/// How often the network is asked about Twinklys while the watch is on.
///
/// A sweep is 254 nine-byte datagrams and a two-second listen — cheap enough
/// that fifteen seconds keeps a strip's arrival visible without the interface
/// ever asking, and rare enough to be invisible on the network.
const TWINKLY_INTERVAL: Duration = Duration::from_secs(15);

/// How long a hotplug burst may settle before one enumeration answers all of
/// it. A wireless receiver announces each of its children separately, and an
/// enumeration per signal would ask the daemon the same question five times.
const SETTLE: Duration = Duration::from_millis(300);

/// Forward OpenRazer's hotplug signals as [`DEVICES_CHANGED`] events.
///
/// Spawned once at startup and quietly absent when there is no daemon — a
/// machine without OpenRazer has nothing to forward, not an error to show.
pub fn spawn_razer(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let state = app.state::<RazerState>();
        let Ok(backend) = state.backend() else {
            return;
        };
        let mut events = match backend.hotplug_events().await {
            Ok(events) => events,
            Err(error) => {
                eprintln!("warn: no hotplug subscription — {error}");
                return;
            }
        };

        while events.recv().await.is_some() {
            // Let the burst settle, then drain it: one enumeration, one event.
            tokio::time::sleep(SETTLE).await;
            while events.try_recv().is_ok() {}

            let devices = match backend.list_devices().await {
                Ok(serials) => crate::commands::enumerate(backend, &serials).await,
                Err(error) => {
                    eprintln!("warn: could not enumerate after hotplug — {error}");
                    continue;
                }
            };
            if let Err(error) = app.emit(DEVICES_CHANGED, &devices) {
                eprintln!("warn: could not emit {DEVICES_CHANGED} — {error}");
            }
        }

        // The daemon restarted or the bus is gone; like the startup connection
        // (state.rs), it is not re-tried until the application is.
        eprintln!("warn: the hotplug subscription ended — plug and unplug will no longer refresh the list");
    });
}

/// The Twinkly poller's handle, so the watch can be turned off again.
#[derive(Default)]
pub struct TwinklyWatch {
    task: Mutex<Option<tauri::async_runtime::JoinHandle<()>>>,
}

/// Start or stop the Twinkly poller — the backend half of the sources switch.
pub async fn set_twinkly_watch(app: AppHandle, watch: &TwinklyWatch, enabled: bool) {
    let mut task = watch.task.lock().await;

    if !enabled {
        if let Some(task) = task.take() {
            task.abort();
        }
        return;
    }
    if task.is_some() {
        // Already watching. Idempotent, because the frontend re-asserts its
        // preference at startup without knowing whether it is the first to.
        return;
    }

    let handle = app.clone();
    *task = Some(tauri::async_runtime::spawn(async move {
        let state = handle.state::<RazerState>();
        // What was last announced. `None` makes the first sweep always emit —
        // the interface may be holding a list from before this watch started.
        let mut known: Option<Vec<TwinklyDevice>> = None;

        loop {
            match discovery::twinkly_devices(state.strips()).await {
                Ok(mut found) => {
                    // Discovery answers in arrival order, which varies sweep
                    // to sweep; sorted, a reshuffle is not a change.
                    found.sort_by(|a, b| a.participant.cmp(&b.participant));

                    // A strip that appears while its group is already running
                    // was skipped when the engine attached, and the engine has
                    // no way to learn of it. Nothing happens unless a running
                    // group is actually missing one of these.
                    let present: Vec<String> =
                        found.iter().map(|device| device.participant.clone()).collect();
                    state.adopt(&present).await;

                    if known.as_ref() != Some(&found) {
                        if let Err(error) = handle.emit(TWINKLY_DEVICES_CHANGED, &found) {
                            eprintln!("warn: could not emit {TWINKLY_DEVICES_CHANGED} — {error}");
                        }
                        known = Some(found);
                    }
                }
                // A sweep that could not run says nothing about the strips —
                // announcing an empty list here would flash every tile away
                // and back on a transient socket error.
                Err(error) => eprintln!("warn: twinkly watch sweep failed — {error}"),
            }

            tokio::time::sleep(TWINKLY_INTERVAL).await;
        }
    }));
}
