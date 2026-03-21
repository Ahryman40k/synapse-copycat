use crate::razer::{
    capabilities::{battery::*, dpi::*, lighting::*, misc::*},
    capability::Capability,
};
use serde::{Deserialize, Serialize};

// ─── CapabilityResponse ───────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(tag = "type", content = "value")]
pub enum CapabilityResponse {
    Ok,
    String(String),
    Int(i32),
    Float(f64),
    Bool(bool),
    IntPair(i32, i32),
    VidPid { vid: i32, pid: i32 },
}

// ─── CapabilityRequest ────────────────────────────────────────────────────────

/// Serialization boundary. This is what the frontend sends over Tauri IPC.
/// All fields map 1-to-1 to a capability struct — no logic lives here.
#[derive(Debug, Deserialize)]
#[serde(tag = "type", content = "args")]
pub enum CapabilityRequest {
    // misc
    GetDeviceName,
    GetDeviceType,
    GetSerial,
    GetVidPid,
    SuspendDevice,
    ResumeDevice,
    GetDeviceImage,
    // dpi
    GetDpi,
    SetDpi { x: i32, y: i32 },
    GetMaxDpi,
    // lighting
    GetBrightness,
    SetBrightness { value: f64 },
    SetChromaStatic { r: u8, g: u8, b: u8 },
    SetChromaSpectrum,
    SetChromaWave { direction: i32 },
    SetChromaBreath { r: u8, g: u8, b: u8 },
    SetChromaNone,
    // battery
    GetBatteryLevel,
    IsCharging,
}

/// Pure routing table — constructs the right capability struct, zero logic.
/// The only match that needs to grow when you add a new capability.
impl From<CapabilityRequest> for Box<dyn Capability> {
    fn from(req: CapabilityRequest) -> Self {
        match req {
            CapabilityRequest::GetDeviceName => Box::new(GetDeviceName),
            CapabilityRequest::GetDeviceType => Box::new(GetDeviceType),
            CapabilityRequest::GetSerial => Box::new(GetSerial),
            CapabilityRequest::GetVidPid => Box::new(GetVidPid),
            CapabilityRequest::SuspendDevice => Box::new(SuspendDevice),
            CapabilityRequest::ResumeDevice => Box::new(ResumeDevice),
            CapabilityRequest::GetDeviceImage => Box::new(GetDeviceImage),
            CapabilityRequest::GetDpi => Box::new(GetDpi),
            CapabilityRequest::SetDpi { x, y } => Box::new(SetDpi { x, y }),
            CapabilityRequest::GetMaxDpi => Box::new(GetMaxDpi),
            CapabilityRequest::GetBrightness => Box::new(GetBrightness),
            CapabilityRequest::SetBrightness { value } => Box::new(SetBrightness { value }),
            CapabilityRequest::SetChromaStatic { r, g, b } => Box::new(SetChromaStatic { r, g, b }),
            CapabilityRequest::SetChromaSpectrum => Box::new(SetChromaSpectrum),
            CapabilityRequest::SetChromaWave { direction } => Box::new(SetChromaWave { direction }),
            CapabilityRequest::SetChromaBreath { r, g, b } => Box::new(SetChromaBreath { r, g, b }),
            CapabilityRequest::SetChromaNone => Box::new(SetChromaNone),
            CapabilityRequest::GetBatteryLevel => Box::new(GetBatteryLevel),
            CapabilityRequest::IsCharging => Box::new(IsCharging),
        }
    }
}
