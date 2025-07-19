mod device;
use device::{ Device, DeviceKind };

mod module;
use module::Module;


#[tauri::command]
pub fn devices() -> Vec<Device> {

  vec![
  Device {
    kind: DeviceKind::Mouse,
    vendor_id: 1111,
    product_id: 6666,
    name: "Mouse of my ass".to_string()
  }
]

}

#[tauri::command]
pub fn modules() -> Vec<Module> {
  vec![]

}

