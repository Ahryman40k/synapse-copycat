use tauri::State;

use crate::capability::{AnyCapabilityRequest, AnyCapabilityResponse};
use crate::discovery::TwinklyDevice;
use crate::wallpapers::Wallpaper;
use crate::razer::engine::ambience::Ambience;
use crate::razer::engine::cadence::Cadence;
use crate::razer::engine::group::{GroupError, GroupId, GroupStatus, ParticipantId};
use openrazer::{
    backend::{BackendError, DeviceBackend},
    dispatch::dispatch,
};

use crate::razer::{
    device::{Device, DeviceKind},
    state::RazerState,
};

/// Invoke any device capability by participant + typed request.
///
/// One command across every protocol: the request's discriminator decides
/// whether it goes to the platform Razer backend (DBus on Linux, REST on
/// Windows) or to a Twinkly over HTTP — see `capability.rs`. The first
/// argument is a `ParticipantId` (a Razer serial, or `twinkly-<mac>`), which
/// is why it is no longer called `serial`.
#[tauri::command]
pub async fn run_capability(
    participant: String,
    request: AnyCapabilityRequest,
    state: State<'_, RazerState>,
) -> Result<AnyCapabilityResponse, BackendError> {
    match request {
        AnyCapabilityRequest::Razer(request) => dispatch(state.backend()?, &participant, request)
            .await
            .map(AnyCapabilityResponse::Razer),
        AnyCapabilityRequest::Twinkly(request) => {
            state.strips().execute(&participant, request).await
        }
    }
}

/// List all connected device serials.
#[tauri::command]
pub async fn devices(state: State<'_, RazerState>) -> Result<Vec<Device>, BackendError> {
    let backend = state.backend()?;
    let serials = backend.list_devices().await?;
    Ok(enumerate(backend, &serials).await)
}

/// Every reported device, enriched. Shared by the `devices` command and the
/// hotplug watcher, so an event carries exactly what a fetch would answer.
pub(crate) async fn enumerate(backend: &dyn DeviceBackend, serials: &[String]) -> Vec<Device> {
    // Fetch misc info for all devices concurrently
    let futures: Vec<_> = serials
        .iter()
        .map(|serial| fetch_device(backend, serial))
        .collect();

    let results = futures::future::join_all(futures).await;

    // Log failures but don't abort — return whatever succeeded
    results
        .into_iter()
        .zip(serials.iter())
        .filter_map(|(result, serial)| match result {
            Ok(device) => Some(device),
            Err(e) => {
                eprintln!("warn: could not enrich device {serial}: {e}");
                None
            }
        })
        .collect()
}

async fn fetch_device(backend: &dyn DeviceBackend, serial: &str) -> Result<Device, BackendError> {
    let (name, type_str, vid_pid, image) = tokio::try_join!(
        backend.get_device_name(serial),
        backend.get_device_type(serial),
        backend.get_vid_pid(serial),
        backend.get_device_image(serial),
    )?;

    Ok(Device {
        serial: serial.to_owned(),
        name,
        kind: DeviceKind::from_type_str(&type_str),
        vendor_id: vid_pid.0,
        product_id: vid_pid.1,
        image,
    })
}

// ─── groups ───────────────────────────────────────────────────────────────────
//
// A group is a set of participants and one ambience across them. Every change
// here is written to disk before it returns, so what the interface sees is
// always what a restart would restore.

/// What the dashboard reads: every group, its participants, and how each of
/// them is actually going.
#[tauri::command]
pub async fn groups(state: State<'_, RazerState>) -> Result<Vec<GroupStatus>, BackendError> {
    Ok(state.groups().await)
}

/// Everything discoverable on the network that is not a Razer device.
///
/// A sweep on every call rather than a cached list: devices come and go, and a
/// list that is only refreshed at startup is wrong the moment someone plugs
/// something in. The sweep costs a couple of seconds and 254 small datagrams.
#[tauri::command]
pub async fn twinkly_devices(
    state: State<'_, RazerState>,
) -> Result<Vec<TwinklyDevice>, BackendError> {
    // An unreachable network answers an empty list here, not an error: the
    // dashboard shows what could be found, and "nothing" is what that is.
    Ok(crate::discovery::twinkly_devices(state.strips())
        .await
        .unwrap_or_else(|error| {
            eprintln!("warn: twinkly discovery failed — {error}");
            Vec::new()
        }))
}

/// Turn the Twinkly poller on or off — the backend half of the sources switch.
///
/// The interface holds the preference (it survives in its localStorage), so it
/// is the one that says. The backend must never sweep a network it was asked
/// to leave alone, which is why the poller cannot simply always run.
#[tauri::command]
pub async fn watch_twinkly(
    enabled: bool,
    app: tauri::AppHandle,
    watch: State<'_, crate::watch::TwinklyWatch>,
) -> Result<(), BackendError> {
    crate::watch::set_twinkly_watch(app, &watch, enabled).await;
    Ok(())
}

/// Ask for a folder of wallpapers.
///
/// `None` when the dialog was dismissed. Not an error: changing your mind is
/// not a failure, and reporting it as one makes the interface apologise for
/// something the user did on purpose.
#[tauri::command]
pub async fn choose_wallpaper_folder(app: tauri::AppHandle) -> Result<Option<String>, BackendError> {
    Ok(crate::wallpapers::choose_folder(&app))
}

/// The images in a folder, each with its palette and a thumbnail.
///
/// Reading and cutting a folder of 4K photographs takes a moment, so it is one
/// call the interface makes deliberately rather than on every refresh.
#[tauri::command]
pub async fn wallpapers(folder: String) -> Result<Vec<Wallpaper>, BackendError> {
    Ok(crate::wallpapers::wallpapers(&folder))
}

/// The devices no group has claimed. Not driven and not broken — worth showing,
/// since one omitted from the list reads as one the app failed to notice.
#[tauri::command]
pub async fn unassigned_participants(
    state: State<'_, RazerState>,
) -> Result<Vec<ParticipantId>, BackendError> {
    state.unassigned().await
}

#[tauri::command]
pub async fn create_group(
    name: String,
    members: Vec<ParticipantId>,
    ambience: Ambience,
    state: State<'_, RazerState>,
) -> Result<GroupId, GroupError> {
    state
        .with_groups(|conductor| conductor.create(name, members, ambience))
        .await
}

#[tauri::command]
pub async fn rename_group(
    id: GroupId,
    name: String,
    state: State<'_, RazerState>,
) -> Result<(), GroupError> {
    state
        .with_groups(|conductor| conductor.rename(id, name))
        .await
}

/// Replaces a group's membership.
///
/// Fails when a participant already belongs elsewhere, naming the group that
/// has it: two engines on one device would each keep undoing the other.
#[tauri::command]
pub async fn set_group_members(
    id: GroupId,
    members: Vec<ParticipantId>,
    state: State<'_, RazerState>,
) -> Result<(), GroupError> {
    state
        .with_groups(|conductor| conductor.set_members(id, members))
        .await
}

/// Changes what a group shows. Takes effect at once on a running group.
#[tauri::command]
pub async fn set_group_ambience(
    id: GroupId,
    ambience: Ambience,
    state: State<'_, RazerState>,
) -> Result<(), GroupError> {
    state
        .with_groups(|conductor| conductor.set_ambience(id, ambience))
        .await
}

/// Changes a group's rate. Applies on the next start.
#[tauri::command]
pub async fn set_group_cadence(
    id: GroupId,
    cadence: Cadence,
    state: State<'_, RazerState>,
) -> Result<(), GroupError> {
    state
        .with_groups(|conductor| conductor.set_cadence(id, cadence))
        .await
}

#[tauri::command]
pub async fn start_group(id: GroupId, state: State<'_, RazerState>) -> Result<(), BackendError> {
    state.start_group(id).await
}

/// Stops a group. The devices keep the last frame: stopping an ambience and
/// going dark are two different requests.
#[tauri::command]
pub async fn stop_group(id: GroupId, state: State<'_, RazerState>) -> Result<(), BackendError> {
    state.stop_group(id).await;
    Ok(())
}

#[tauri::command]
pub async fn remove_group(id: GroupId, state: State<'_, RazerState>) -> Result<(), BackendError> {
    state.remove_group(id).await
}
