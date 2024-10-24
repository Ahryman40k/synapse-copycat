use serde_json::Result;
use zbus::{proxy, Connection};

use std::error::Error;

#[proxy(
    default_service = "org.razer",
    default_path = "/org/razer",
    interface = "razer.devices"
)]
trait RazerDeviceProvider {
    fn getDevices(&self) -> zbus::Result<Vec<String>>;

    fn supportedDevices(&self) -> zbus::Result<String>;
}

#[proxy(default_service = "razer.daemon", default_path = "/org/razer")]
trait RazerDaemon {
    fn stop(&self) -> zbus::Result<()>;
    fn version(&self) -> zbus::Result<String>;
}

pub async fn device_list() -> () {
    // let connection = Connection::session().await?;
    //
    // let proxy = RazerDeviceProviderProxy::new(&connection).await?;
    // let device_provider = proxy.getDevices().await?;

    // for deviceId in device_provider {}
}
