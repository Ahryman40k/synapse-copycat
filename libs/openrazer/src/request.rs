use crate::{
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

// ─── Discovery ────────────────────────────────────────────────────────────────
//
// Not every device can do every capability, and the difference is finer than
// the device's kind. Introspected against the daemon: a Goliathus publishes
// `razer.device.lighting.chroma` but **no `setWave`**, and a Kraken publishes
// the same interface with no `setKeyRow` and no `setCustom` — so a control
// wired from the interface alone would offer a wave that answers
// `org.freedesktop.DBus.Error.UnknownMethod`.
//
// So discovery is per **method**, not per interface, and the daemon is asked
// rather than guessed at.

impl CapabilityRequest {
    /// The `type` this arrives as on the wire.
    ///
    /// Exhaustive on purpose: a new capability cannot compile without an arm
    /// here, and [`CATALOGUE`] is then checked against this by the tests below.
    /// Between the two, a capability that discovery would silently never
    /// report is caught at build time rather than by a user finding a dead
    /// control.
    pub const fn name(&self) -> &'static str {
        match self {
            Self::GetDeviceName => "GetDeviceName",
            Self::GetDeviceType => "GetDeviceType",
            Self::GetSerial => "GetSerial",
            Self::GetVidPid => "GetVidPid",
            Self::SuspendDevice => "SuspendDevice",
            Self::ResumeDevice => "ResumeDevice",
            Self::GetDeviceImage => "GetDeviceImage",
            Self::GetDpi => "GetDpi",
            Self::SetDpi { .. } => "SetDpi",
            Self::GetMaxDpi => "GetMaxDpi",
            Self::GetBrightness => "GetBrightness",
            Self::SetBrightness { .. } => "SetBrightness",
            Self::SetChromaStatic { .. } => "SetChromaStatic",
            Self::SetChromaSpectrum => "SetChromaSpectrum",
            Self::SetChromaWave { .. } => "SetChromaWave",
            Self::SetChromaBreath { .. } => "SetChromaBreath",
            Self::SetChromaNone => "SetChromaNone",
            Self::GetBatteryLevel => "GetBatteryLevel",
            Self::IsCharging => "IsCharging",
        }
    }
}

/// Every capability, and the DBus methods it cannot work without.
///
/// `interface.method`, exactly as introspection reports them — which is why
/// the odd-looking ones are spelt the way they are: OpenRazer's DPI methods
/// are `getDPI`/`setDPI`/`maxDPI` with the initialism uppercase, and battery
/// lives on `razer.device.power` as `getBattery`, not on a `battery`
/// interface at all. Both were found by introspecting, not by reading docs.
///
/// A capability is reported as supported when the device publishes **all** of
/// its methods.
pub const CATALOGUE: &[(&str, &[&str])] = &[
    // misc
    ("GetDeviceName", &["razer.device.misc.getDeviceName"]),
    ("GetDeviceType", &["razer.device.misc.getDeviceType"]),
    ("GetSerial", &["razer.device.misc.getSerial"]),
    ("GetVidPid", &["razer.device.misc.getVidPid"]),
    ("SuspendDevice", &["razer.device.misc.suspendDevice"]),
    ("ResumeDevice", &["razer.device.misc.resumeDevice"]),
    ("GetDeviceImage", &["razer.device.misc.getDeviceImage"]),
    // dpi
    ("GetDpi", &["razer.device.dpi.getDPI"]),
    ("SetDpi", &["razer.device.dpi.setDPI"]),
    ("GetMaxDpi", &["razer.device.dpi.maxDPI"]),
    // lighting.brightness
    (
        "GetBrightness",
        &["razer.device.lighting.brightness.getBrightness"],
    ),
    (
        "SetBrightness",
        &["razer.device.lighting.brightness.setBrightness"],
    ),
    // lighting.chroma
    (
        "SetChromaStatic",
        &["razer.device.lighting.chroma.setStatic"],
    ),
    (
        "SetChromaSpectrum",
        &["razer.device.lighting.chroma.setSpectrum"],
    ),
    ("SetChromaWave", &["razer.device.lighting.chroma.setWave"]),
    (
        "SetChromaBreath",
        &["razer.device.lighting.chroma.setBreathSingle"],
    ),
    ("SetChromaNone", &["razer.device.lighting.chroma.setNone"]),
    // battery — on `razer.device.power`, which is not a name anyone would guess
    ("GetBatteryLevel", &["razer.device.power.getBattery"]),
    ("IsCharging", &["razer.device.power.isCharging"]),
];

/// Which capabilities a device publishing `methods` can actually be asked for.
///
/// `methods` is what introspection reported, as `interface.method`. Order
/// follows [`CATALOGUE`] so the answer is stable between calls — a list that
/// reshuffles would make the interface redraw for nothing.
pub fn supported_from(methods: &std::collections::BTreeSet<String>) -> Vec<String> {
    CATALOGUE
        .iter()
        .filter(|(_, required)| required.iter().all(|m| methods.contains(*m)))
        .map(|(name, _)| (*name).to_string())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::BTreeSet;

    /// One of every variant. The `name` match is exhaustive, so adding a
    /// capability forces an arm there; this list is what then forces it into
    /// the catalogue too.
    fn every_request() -> Vec<CapabilityRequest> {
        vec![
            CapabilityRequest::GetDeviceName,
            CapabilityRequest::GetDeviceType,
            CapabilityRequest::GetSerial,
            CapabilityRequest::GetVidPid,
            CapabilityRequest::SuspendDevice,
            CapabilityRequest::ResumeDevice,
            CapabilityRequest::GetDeviceImage,
            CapabilityRequest::GetDpi,
            CapabilityRequest::SetDpi { x: 800, y: 800 },
            CapabilityRequest::GetMaxDpi,
            CapabilityRequest::GetBrightness,
            CapabilityRequest::SetBrightness { value: 1.0 },
            CapabilityRequest::SetChromaStatic { r: 0, g: 0, b: 0 },
            CapabilityRequest::SetChromaSpectrum,
            CapabilityRequest::SetChromaWave { direction: 1 },
            CapabilityRequest::SetChromaBreath { r: 0, g: 0, b: 0 },
            CapabilityRequest::SetChromaNone,
            CapabilityRequest::GetBatteryLevel,
            CapabilityRequest::IsCharging,
        ]
    }

    #[test]
    fn every_capability_is_in_the_catalogue() {
        // A capability missing here is one discovery would never report, so
        // the control for it would never appear however well it works.
        for request in every_request() {
            assert!(
                CATALOGUE.iter().any(|(name, _)| *name == request.name()),
                "{} is not in the catalogue",
                request.name()
            );
        }
    }

    #[test]
    fn the_catalogue_names_nothing_twice_and_nothing_empty() {
        let mut seen = BTreeSet::new();
        for (name, required) in CATALOGUE {
            assert!(seen.insert(*name), "{name} is in the catalogue twice");
            assert!(
                !required.is_empty(),
                "{name} claims to need no method, so it would be reported \
                 supported on every device including ones that lack it"
            );
            for method in *required {
                assert!(
                    method.starts_with("razer.") && method.matches('.').count() >= 3,
                    "{method} is not an interface.method name"
                );
            }
        }
    }

    #[test]
    fn a_device_is_offered_only_what_it_publishes() {
        // The Goliathus, as introspected: chroma, but no `setWave`.
        let methods: BTreeSet<String> = [
            "razer.device.lighting.chroma.setStatic",
            "razer.device.lighting.chroma.setSpectrum",
            "razer.device.lighting.chroma.setNone",
        ]
        .iter()
        .map(|m| (*m).to_string())
        .collect();

        let supported = supported_from(&methods);

        assert!(supported.contains(&"SetChromaStatic".to_string()));
        assert!(
            !supported.contains(&"SetChromaWave".to_string()),
            "offered a wave the device would refuse"
        );
        // And nothing from an interface it does not publish at all.
        assert!(!supported.contains(&"GetDpi".to_string()));
        assert!(!supported.contains(&"GetBatteryLevel".to_string()));
    }

    #[test]
    fn a_device_that_publishes_nothing_is_offered_nothing() {
        // Rather than everything, which is what a naive `all()` over an empty
        // requirement list would do.
        assert!(supported_from(&BTreeSet::new()).is_empty());
    }
}
