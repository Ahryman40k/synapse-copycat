//! Sweep the network and ask whatever answers what it is.
//!
//! An example rather than a test: it needs a device on the network, and a suite
//! that fails on a machine with nothing plugged in teaches people to ignore it.
//!
//! ```sh
//! cargo run -p twinkly --example discover
//! ```

use std::time::Duration;

#[tokio::main]
async fn main() -> twinkly::Result<()> {
    let found = twinkly::discover(Duration::from_secs(3)).await?;
    println!("{} device(s)", found.len());

    for device in found {
        println!("\n{} at {}", device.name, device.address);

        match twinkly::Device::new(device.address).gestalt().await {
            Ok(gestalt) => println!(
                "  {} · {} LEDs · {} · {} bytes per LED · {}",
                gestalt.product_code,
                gestalt.number_of_led,
                gestalt.led_profile,
                gestalt.bytes_per_led,
                gestalt.mac,
            ),
            Err(error) => println!("  could not be asked: {error}"),
        }
    }

    Ok(())
}
