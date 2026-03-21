use serde::Serialize;
use specta::Type;

#[derive(Debug, Serialize, Clone, Type)]
pub struct Device {
    pub serial: String,
    pub name: String,
    pub vendor_id: i32,
    pub product_id: i32,
    pub kind: DeviceKind,
    pub image: String,
}

#[derive(Debug, Serialize, Clone, Type)]
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
            "keyboard" => Self::Keyboard,
            "mouse" => Self::Mouse,
            "mousemat" | "mousepad" => Self::Mousemat,
            "headset" => Self::Headset,
            "accessory" => Self::Accessory,
            _ => Self::Unknown,
        }
    }
}
