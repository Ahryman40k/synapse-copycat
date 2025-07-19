
use serde::Serialize;

#[derive(Serialize)]
pub enum DeviceKind {
  Mouse,
  Keyboard,
  Mousemat,
  Streaming,
  Accessory
}


#[derive(Serialize)]
pub struct Device {
  pub kind: DeviceKind,
  pub product_id: u16,
  pub vendor_id: u16,
  pub name: String,
}





