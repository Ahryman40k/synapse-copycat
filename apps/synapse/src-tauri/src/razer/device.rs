use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct Device {
    pub serial: String,
    pub name: String,
    pub vendor_id: i32,
    pub product_id: i32,
    pub kind: DeviceKind,
    pub image: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "snake_case")]
pub enum DeviceKind {
    Keyboard,
    Mouse,
    Mousemat,
    Headset,
    Accessory,
    Unknown,
}

impl DeviceKind {
    pub fn from_type_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            // A keypad is a small keyboard, and not only by analogy: the
            // Tartarus V2 publishes exactly the interfaces the Huntsman Elite
            // does — `macro`, `led.gamemode`, `led.macromode`,
            // `lighting.custom`, `lighting.chroma`, `lighting.brightness`.
            // Introspected against the daemon, not assumed.
            "keyboard" | "keypad" => Self::Keyboard,
            "mouse" => Self::Mouse,
            "mousemat" | "mousepad" => Self::Mousemat,
            "headset" => Self::Headset,
            "accessory" => Self::Accessory,
            // `core` — an external GPU enclosure — is the only type OpenRazer
            // reports that lands here now.
            _ => Self::Unknown,
        }
    }
}
