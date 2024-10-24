use rusb::{Context, DeviceHandle, Result};

// sample to send message to usb device

fn main() -> Result<()> {
    let context = Context::new()?;
    let devices = context.devices()?;
    let device = devices.iter().find(|device| {
        device
            .device_descriptor()
            .map(|desc| desc.vendor_id() == 0x1234 && desc.product_id() == 0x5678)
            .unwrap_or(false)
    });


    if let Some(device) = device {
        let handle = device.open()?;
        let endpoint = handle
            .device()
            .configurations()
            .iter()
            .flat_map(|config| config.interfaces())
            .flat_map(|interface| interface.descriptors())
            .flat_map(|descriptor| descriptor.endpoint_descriptors())
            .find(|endpoint| endpoint.direction() == rusb::Direction::Out)
            .unwrap();


            handle.

            let message = b"\x01\x02\x03";
        let timeout = std::time::Duration::from_secs(1);
        let result = handle.write_bulk(endpoint.address(), message, timeout)?;

        println!("Sent {} bytes to USB device", result);
    }

    /*
    // to read
    if let Some(device) = device {
        let handle = device.open()?;
        let endpoint = handle
            .device()
            .configurations()
            .iter()
            .flat_map(|config| config.interfaces())
            .flat_map(|interface| interface.descriptors())
            .flat_map(|descriptor| descriptor.endpoint_descriptors())
            .find(|endpoint| endpoint.direction() == rusb::Direction::In)
            .unwrap();

        let mut buffer = [0u8; 64];
        let timeout = std::time::Duration::from_secs(1);
        let result = handle.read_bulk(endpoint.address(), &mut buffer, timeout)?;

        println!("Received {} bytes from USB device: {:?}", result, &buffer[..result]);
    }

     */




    Ok(())
}

/*
This code uses the write_bulk method to send a message to a USB device. The find method is used to locate the device with the specified vendor and product IDs. The endpoint_descriptors method is used to find the endpoint descriptor for the OUT endpoint. Finally, the write_bulk method is used to send the message to the device.
*/


/* 
to write code specifically for windows or linux do 
openrazer-rs in linux ? razer sdk in windows ?


#[cfg(target_os = "windows")]
fn main() {
    println!("This is Windows!");
}

#[cfg(target_os = "linux")]
fn main() {
    println!("This is Linux!");
}


*/