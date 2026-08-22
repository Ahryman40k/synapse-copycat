use tauri::State;

use crate::discovery::TwinklyDevice;
use crate::razer::engine::ambience::Ambience;
use crate::razer::engine::cadence::Cadence;
use crate::razer::engine::group::{GroupError, GroupId, GroupStatus, ParticipantId};
use openrazer::{
    backend::{BackendError, DeviceBackend},
    dispatch::dispatch,
    request::{CapabilityRequest, CapabilityResponse},
};

use crate::razer::{
    device::{Device, DeviceKind},
    state::RazerState,
};

/// Invoke any device capability by serial + typed request.
/// Works identically on Linux (DBus) and Windows (REST) —
/// the backend is resolved transparently via the trait object in RazerState.
#[tauri::command]
pub async fn run_capability(
    serial: String,
    request: CapabilityRequest,
    state: State<'_, RazerState>,
) -> Result<CapabilityResponse, BackendError> {
    dispatch(state.backend()?, &serial, request).await
}

/// List all connected device serials.
#[tauri::command]
pub async fn devices(state: State<'_, RazerState>) -> Result<Vec<Device>, BackendError> {
    let backend = state.backend()?;
    let serials = backend.list_devices().await?;

    // Fetch misc info for all devices concurrently
    let futures: Vec<_> = serials
        .iter()
        .map(|serial| fetch_device(backend, serial))
        .collect();

    let results = futures::future::join_all(futures).await;

    // Log failures but don't abort — return whatever succeeded
    Ok(results
        .into_iter()
        .zip(serials.iter())
        .filter_map(|(result, serial)| match result {
            Ok(device) => Some(device),
            Err(e) => {
                eprintln!("warn: could not enrich device {serial}: {e}");
                None
            }
        })
        .collect())
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
pub async fn twinkly_devices() -> Result<Vec<TwinklyDevice>, BackendError> {
    Ok(crate::discovery::twinkly_devices().await)
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
