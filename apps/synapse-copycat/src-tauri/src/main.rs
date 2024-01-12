// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// use usb_enumeration::{ Observer, Event};

use serde::ser::{Serialize, SerializeStruct, Serializer};

#[derive(PartialEq, Debug)]
struct RazerDevice {
    product_id: u16,
    vendor_id: u16,
}

impl Serialize for RazerDevice {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut s = serializer.serialize_struct("RazerDevice", 2)?;
        s.serialize_field("product_id", &self.product_id)?;
        s.serialize_field("vendor_id", &self.vendor_id)?;
        s.end()
    }
}

#[tauri::command]
fn devices() -> Vec<RazerDevice> {
    /*  let sub = Observer::new()
    .with_poll_interval(2)
    .with_vendor_id(0x1234)
    .with_product_id(0x5678)
    .subscribe();

    for event in sub.rx_event.iter() {
        match event {
            Event::Initial(d) => println!("Initial devices: {:?}", d),
            Event::Connect(d) => println!("Connected device: {:?}", d),
            Event::Disconnect(d) => println!("Disconnected device: {:?}", d),
        }
    }*/

    let mut devices = usb_enumeration::enumerate(Some(0x1532), None);
    devices.sort_by(|a, b| a.product_id.cmp(&b.product_id));
    devices.dedup_by(|a, b| a.product_id == b.product_id && a.vendor_id == b.vendor_id);

    let mut result = vec![];
    for device in devices {
        result.push(RazerDevice {
            vendor_id: device.vendor_id,
            product_id: device.product_id,
        });
    }

    result
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![devices])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
