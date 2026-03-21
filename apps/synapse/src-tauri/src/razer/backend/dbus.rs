#![cfg(target_os = "linux")]

use std::future::Future;
use std::pin::Pin;
use zbus::Connection;

use super::{BackendError, DeviceBackend};

type BoxFuture<'a, T> = Pin<Box<dyn Future<Output = T> + Send + 'a>>;

// ─── zbus proxy definitions ───────────────────────────────────────────────────

#[zbus::proxy(
    interface = "razer.devices",
    default_service = "org.razer",
    default_path = "/org/razer"
)]
trait RazerDevice {
    #[zbus(name = "getDevices")]
    fn get_devices(&self) -> zbus::Result<Vec<String>>;
}

#[zbus::proxy(interface = "razer.device.misc", default_service = "org.razer")]
trait RazerDeviceMisc {
    #[zbus(name = "getDeviceName")]
    fn get_device_name(&self) -> zbus::Result<String>;
    #[zbus(name = "getDeviceType")]
    fn get_device_type(&self) -> zbus::Result<String>;
    #[zbus(name = "getSerial")]
    fn get_serial(&self) -> zbus::Result<String>;
    #[zbus(name = "getVidPid")]
    fn get_vid_pid(&self) -> zbus::Result<Vec<i32>>;
    #[zbus(name = "suspendDevice")]
    fn suspend_device(&self) -> zbus::Result<()>;
    #[zbus(name = "resumeDevice")]
    fn resume_device(&self) -> zbus::Result<()>;
    #[zbus(name = "getDeviceImage")]
    fn get_device_image(&self) -> zbus::Result<String>;
}

#[zbus::proxy(interface = "razer.device.dpi", default_service = "org.razer")]
trait RazerDeviceDpi {
    fn get_dpi(&self) -> zbus::Result<(i32, i32)>;
    fn set_dpi(&self, x: i32, y: i32) -> zbus::Result<()>;
    fn get_max_dpi(&self) -> zbus::Result<i32>;
}

#[zbus::proxy(
    interface = "razer.device.lighting.brightness",
    default_service = "org.razer"
)]
trait RazerLightingBrightness {
    fn get_brightness(&self) -> zbus::Result<f64>;
    fn set_brightness(&self, v: f64) -> zbus::Result<()>;
}

#[zbus::proxy(
    interface = "razer.device.lighting.chroma",
    default_service = "org.razer"
)]
trait RazerLightingChroma {
    fn set_static(&self, r: u8, g: u8, b: u8) -> zbus::Result<()>;
    fn set_spectrum(&self) -> zbus::Result<()>;
    fn set_wave(&self, direction: i32) -> zbus::Result<()>;
    fn set_breath_single(&self, r: u8, g: u8, b: u8) -> zbus::Result<()>;
    fn set_none(&self) -> zbus::Result<()>;
}

#[zbus::proxy(interface = "razer.device.battery", default_service = "org.razer")]
trait RazerBattery {
    fn get_battery_level(&self) -> zbus::Result<f64>;
    fn is_charging(&self) -> zbus::Result<bool>;
}

// ─── proxy builder macro ──────────────────────────────────────────────────────

macro_rules! proxy_at {
    ($ProxyType:ty, $conn:expr, $path:expr) => {{
        <$ProxyType>::builder($conn)
            .path($path)
            .map_err(|e| BackendError::Transport(e.to_string()))?
            .build()
            .await
            .map_err(|e| match e {
                zbus::Error::InterfaceNotFound => {
                    BackendError::InterfaceUnsupported(stringify!($ProxyType).to_string())
                }
                other => BackendError::Transport(other.to_string()),
            })?
    }};
}

// ─── DbusBackend ──────────────────────────────────────────────────────────────

pub struct DbusBackend {
    conn: Connection,
}

impl DbusBackend {
    pub async fn new() -> Result<Self, BackendError> {
        let conn = Connection::session()
            .await
            .map_err(|e| BackendError::Transport(e.to_string()))?;
        Ok(Self { conn })
    }

    fn device_path(serial: &str) -> String {
        format!("/org/razer/device/{}", serial)
    }
}

impl DeviceBackend for DbusBackend {
    fn list_devices(&self) -> BoxFuture<'_, Result<Vec<String>, BackendError>> {
        Box::pin(async move {
            let proxy = RazerDeviceProxy::new(&self.conn)
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))?;
            proxy
                .get_devices()
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))
        })
    }

    fn get_device_name(&self, serial: &str) -> BoxFuture<'_, Result<String, BackendError>> {
        let path = Self::device_path(serial);
        Box::pin(async move {
            let p = proxy_at!(RazerDeviceMiscProxy, &self.conn, path);
            p.get_device_name()
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))
        })
    }

    fn get_device_type(&self, serial: &str) -> BoxFuture<'_, Result<String, BackendError>> {
        let path = Self::device_path(serial);
        Box::pin(async move {
            let p = proxy_at!(RazerDeviceMiscProxy, &self.conn, path);
            p.get_device_type()
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))
        })
    }

    fn get_serial(&self, serial: &str) -> BoxFuture<'_, Result<String, BackendError>> {
        let path = Self::device_path(serial);
        Box::pin(async move {
            let p = proxy_at!(RazerDeviceMiscProxy, &self.conn, path);
            p.get_serial()
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))
        })
    }

    fn get_vid_pid(&self, serial: &str) -> BoxFuture<'_, Result<(i32, i32), BackendError>> {
        let path = Self::device_path(serial);
        Box::pin(async move {
            let p = proxy_at!(RazerDeviceMiscProxy, &self.conn, path);
            let ids = p
                .get_vid_pid()
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))?;
            Ok((
                ids.first().copied().unwrap_or(0),
                ids.get(1).copied().unwrap_or(0),
            ))
        })
    }

    fn suspend_device(&self, serial: &str) -> BoxFuture<'_, Result<(), BackendError>> {
        let path = Self::device_path(serial);
        Box::pin(async move {
            proxy_at!(RazerDeviceMiscProxy, &self.conn, path)
                .suspend_device()
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))
        })
    }

    fn resume_device(&self, serial: &str) -> BoxFuture<'_, Result<(), BackendError>> {
        let path = Self::device_path(serial);
        Box::pin(async move {
            proxy_at!(RazerDeviceMiscProxy, &self.conn, path)
                .resume_device()
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))
        })
    }

    fn get_device_image(&self, serial: &str) -> BoxFuture<'_, Result<String, BackendError>> {
        let path = Self::device_path(serial);
        Box::pin(async move {
            let p = proxy_at!(RazerDeviceMiscProxy, &self.conn, path);
            p.get_device_image()
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))
        })
    }

    fn get_dpi(&self, serial: &str) -> BoxFuture<'_, Result<(i32, i32), BackendError>> {
        let path = Self::device_path(serial);
        Box::pin(async move {
            proxy_at!(RazerDeviceDpiProxy, &self.conn, path)
                .get_dpi()
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))
        })
    }

    fn set_dpi(&self, serial: &str, x: i32, y: i32) -> BoxFuture<'_, Result<(), BackendError>> {
        let path = Self::device_path(serial);
        Box::pin(async move {
            proxy_at!(RazerDeviceDpiProxy, &self.conn, path)
                .set_dpi(x, y)
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))
        })
    }

    fn get_max_dpi(&self, serial: &str) -> BoxFuture<'_, Result<i32, BackendError>> {
        let path = Self::device_path(serial);
        Box::pin(async move {
            proxy_at!(RazerDeviceDpiProxy, &self.conn, path)
                .get_max_dpi()
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))
        })
    }

    fn get_brightness(&self, serial: &str) -> BoxFuture<'_, Result<f64, BackendError>> {
        let path = Self::device_path(serial);
        Box::pin(async move {
            proxy_at!(RazerLightingBrightnessProxy, &self.conn, path)
                .get_brightness()
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))
        })
    }

    fn set_brightness(&self, serial: &str, value: f64) -> BoxFuture<'_, Result<(), BackendError>> {
        let path = Self::device_path(serial);
        Box::pin(async move {
            proxy_at!(RazerLightingBrightnessProxy, &self.conn, path)
                .set_brightness(value)
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))
        })
    }

    fn set_chroma_static(
        &self,
        serial: &str,
        r: u8,
        g: u8,
        b: u8,
    ) -> BoxFuture<'_, Result<(), BackendError>> {
        let path = Self::device_path(serial);
        Box::pin(async move {
            proxy_at!(RazerLightingChromaProxy, &self.conn, path)
                .set_static(r, g, b)
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))
        })
    }

    fn set_chroma_spectrum(&self, serial: &str) -> BoxFuture<'_, Result<(), BackendError>> {
        let path = Self::device_path(serial);
        Box::pin(async move {
            proxy_at!(RazerLightingChromaProxy, &self.conn, path)
                .set_spectrum()
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))
        })
    }

    fn set_chroma_wave(
        &self,
        serial: &str,
        direction: i32,
    ) -> BoxFuture<'_, Result<(), BackendError>> {
        let path = Self::device_path(serial);
        Box::pin(async move {
            proxy_at!(RazerLightingChromaProxy, &self.conn, path)
                .set_wave(direction)
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))
        })
    }

    fn set_chroma_breath(
        &self,
        serial: &str,
        r: u8,
        g: u8,
        b: u8,
    ) -> BoxFuture<'_, Result<(), BackendError>> {
        let path = Self::device_path(serial);
        Box::pin(async move {
            proxy_at!(RazerLightingChromaProxy, &self.conn, path)
                .set_breath_single(r, g, b)
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))
        })
    }

    fn set_chroma_none(&self, serial: &str) -> BoxFuture<'_, Result<(), BackendError>> {
        let path = Self::device_path(serial);
        Box::pin(async move {
            proxy_at!(RazerLightingChromaProxy, &self.conn, path)
                .set_none()
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))
        })
    }

    fn get_battery_level(&self, serial: &str) -> BoxFuture<'_, Result<f64, BackendError>> {
        let path = Self::device_path(serial);
        Box::pin(async move {
            proxy_at!(RazerBatteryProxy, &self.conn, path)
                .get_battery_level()
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))
        })
    }

    fn is_charging(&self, serial: &str) -> BoxFuture<'_, Result<bool, BackendError>> {
        let path = Self::device_path(serial);
        Box::pin(async move {
            proxy_at!(RazerBatteryProxy, &self.conn, path)
                .is_charging()
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))
        })
    }
}
