use tauri::State;

use crate::razer::{
    backend::{BackendError, DeviceBackend},
    device::{Device, DeviceKind},
    dispatch::dispatch,
    request::{CapabilityRequest, CapabilityResponse},
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

async fn fetch_device(
    backend: &dyn DeviceBackend,
    serial: &str,
) -> Result<Device, BackendError> {
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
