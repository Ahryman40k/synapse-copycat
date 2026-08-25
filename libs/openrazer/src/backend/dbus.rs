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

    // The daemon's hotplug notices. Python names, so genuinely snake_case —
    // the explicit rename is there so nobody "fixes" them to camelCase.
    #[zbus(signal, name = "device_added")]
    fn device_added(&self) -> zbus::Result<()>;
    #[zbus(signal, name = "device_removed")]
    fn device_removed(&self) -> zbus::Result<()>;
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
    #[zbus(name = "hasMatrix")]
    fn has_matrix(&self) -> zbus::Result<bool>;
    #[zbus(name = "getMatrixDimensions")]
    fn get_matrix_dimensions(&self) -> zbus::Result<Vec<i32>>;
}

// ⚠️ Every method needs an explicit `#[zbus(name = "…")]`. Without one, zbus
// derives the DBus name from the Rust name in PascalCase — `set_static`
// becomes `SetStatic` — and OpenRazer's are lowerCamelCase, with initialisms
// left uppercase: `setStatic`, `setDPI`. A wrong name is not a compile error;
// it is an `org.freedesktop.DBus.Error.UnknownMethod` at runtime, which is how
// every one of these went unnoticed until a daemon answered.

#[zbus::proxy(interface = "razer.device.dpi", default_service = "org.razer")]
trait RazerDeviceDpi {
    // `ai` on the wire, not `(ii)`: OpenRazer answers an array, exactly like
    // `getVidPid`. Declaring the tuple compiles and fails at runtime with
    // "Signature mismatch: got `ai`, expected `(ii)`".
    #[zbus(name = "getDPI")]
    fn get_dpi(&self) -> zbus::Result<Vec<i32>>;
    #[zbus(name = "setDPI")]
    fn set_dpi(&self, x: i32, y: i32) -> zbus::Result<()>;
    #[zbus(name = "maxDPI")]
    fn get_max_dpi(&self) -> zbus::Result<i32>;
}

#[zbus::proxy(
    interface = "razer.device.lighting.brightness",
    default_service = "org.razer"
)]
trait RazerLightingBrightness {
    #[zbus(name = "getBrightness")]
    fn get_brightness(&self) -> zbus::Result<f64>;
    #[zbus(name = "setBrightness")]
    fn set_brightness(&self, v: f64) -> zbus::Result<()>;
}

#[zbus::proxy(
    interface = "razer.device.lighting.chroma",
    default_service = "org.razer"
)]
trait RazerLightingChroma {
    #[zbus(name = "setStatic")]
    fn set_static(&self, r: u8, g: u8, b: u8) -> zbus::Result<()>;
    #[zbus(name = "setSpectrum")]
    fn set_spectrum(&self) -> zbus::Result<()>;
    #[zbus(name = "setWave")]
    fn set_wave(&self, direction: i32) -> zbus::Result<()>;
    #[zbus(name = "setBreathSingle")]
    fn set_breath_single(&self, r: u8, g: u8, b: u8) -> zbus::Result<()>;
    #[zbus(name = "setNone")]
    fn set_none(&self) -> zbus::Result<()>;
    #[zbus(name = "setKeyRow")]
    fn set_key_row(&self, payload: &[u8]) -> zbus::Result<()>;
    #[zbus(name = "setCustom")]
    fn set_custom(&self) -> zbus::Result<()>;
}

// `razer.device.battery` does not exist — introspected across all four devices
// and found on none. The daemon carries battery on `razer.device.power`, and
// the level is `getBattery`, not `getBatteryLevel`.
#[zbus::proxy(interface = "razer.device.power", default_service = "org.razer")]
trait RazerBattery {
    #[zbus(name = "getBattery")]
    fn get_battery_level(&self) -> zbus::Result<f64>;
    #[zbus(name = "isCharging")]
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
            let dpi = proxy_at!(RazerDeviceDpiProxy, &self.conn, path)
                .get_dpi()
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))?;
            Ok((
                dpi.first().copied().unwrap_or(0),
                dpi.get(1).copied().unwrap_or(0),
            ))
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

    // ── the custom matrix ─────────────────────────────────────────────────────

    fn has_matrix(&self, serial: &str) -> BoxFuture<'_, Result<bool, BackendError>> {
        let path = Self::device_path(serial);
        Box::pin(async move {
            proxy_at!(RazerDeviceMiscProxy, &self.conn, path)
                .has_matrix()
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))
        })
    }

    fn matrix_dimensions(&self, serial: &str) -> BoxFuture<'_, Result<(u8, u8), BackendError>> {
        let path = Self::device_path(serial);
        Box::pin(async move {
            // `ai` on the wire, like `getDPI` and `getVidPid`. A device with no
            // matrix answers an empty list rather than an error, which reads
            // here as a 0x0 matrix — nothing to paint, which is the truth.
            let dims = proxy_at!(RazerDeviceMiscProxy, &self.conn, path)
                .get_matrix_dimensions()
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))?;
            Ok((
                dims.first().copied().unwrap_or(0) as u8,
                dims.get(1).copied().unwrap_or(0) as u8,
            ))
        })
    }

    fn set_key_row(
        &self,
        serial: &str,
        payload: Vec<u8>,
    ) -> BoxFuture<'_, Result<(), BackendError>> {
        let path = Self::device_path(serial);
        Box::pin(async move {
            proxy_at!(RazerLightingChromaProxy, &self.conn, path)
                .set_key_row(&payload)
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))
        })
    }

    fn show_custom_frame(&self, serial: &str) -> BoxFuture<'_, Result<(), BackendError>> {
        let path = Self::device_path(serial);
        Box::pin(async move {
            proxy_at!(RazerLightingChromaProxy, &self.conn, path)
                .set_custom()
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))
        })
    }

    fn supported_methods(
        &self,
        serial: &str,
    ) -> BoxFuture<'_, Result<std::collections::BTreeSet<String>, BackendError>> {
        let path = Self::device_path(serial);
        Box::pin(async move {
            let proxy = zbus::fdo::IntrospectableProxy::builder(&self.conn)
                .destination("org.razer")
                .map_err(|e| BackendError::Transport(e.to_string()))?
                .path(path)
                .map_err(|e| BackendError::Transport(e.to_string()))?
                .build()
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))?;

            let xml = proxy
                .introspect()
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))?;

            parse_methods(&xml)
        })
    }

    fn hotplug_events(
        &self,
    ) -> BoxFuture<'_, Result<tokio::sync::mpsc::Receiver<super::Hotplug>, BackendError>> {
        Box::pin(async move {
            use futures::StreamExt as _;

            // Subscribed here, before the task spawns, so a daemon that cannot
            // be reached refuses the call instead of a channel that just never
            // speaks.
            let proxy = RazerDeviceProxy::new(&self.conn)
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))?;
            let mut added = proxy
                .receive_device_added()
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))?;
            let mut removed = proxy
                .receive_device_removed()
                .await
                .map_err(|e| BackendError::Transport(e.to_string()))?;

            // Room for a burst — a wireless receiver announcing its children —
            // without ever blocking the DBus dispatch on a slow consumer.
            let (sender, receiver) = tokio::sync::mpsc::channel(16);
            tokio::spawn(async move {
                loop {
                    let event = tokio::select! {
                        Some(_) = added.next() => super::Hotplug::Added,
                        Some(_) = removed.next() => super::Hotplug::Removed,
                        // Both streams ended: the connection is gone. Dropping
                        // the sender is how the receiver learns.
                        else => break,
                    };
                    if sender.send(event).await.is_err() {
                        break;
                    }
                }
            });

            Ok(receiver)
        })
    }
}

// ─── Introspection ────────────────────────────────────────────────────────────

/// Pull `interface.method` out of a DBus introspection document.
///
/// Hand-walked rather than deserialised into a document tree: the only thing
/// wanted is which methods exist, the format is fixed by the DBus
/// specification, and a method with no arguments arrives as an empty element
/// while one with arguments arrives as a start tag — which is the single
/// wrinkle worth knowing and the reason both are matched below.
fn parse_methods(xml: &str) -> Result<std::collections::BTreeSet<String>, BackendError> {
    use quick_xml::events::{BytesStart, Event};
    use quick_xml::Reader;

    fn attribute(element: &BytesStart<'_>, wanted: &[u8]) -> Option<String> {
        element
            .attributes()
            .flatten()
            .find(|attribute| attribute.key.as_ref() == wanted)
            // `Implicit1_0`, matching what the deprecated `unescape_value` did.
            // Introspection documents declare no version, and DBus names are
            // restricted to `[A-Za-z0-9_]` anyway, so no entity ever appears
            // here — the normalisation is for correctness, not for a case that
            // arises.
            .and_then(|attribute| {
                attribute
                    .normalized_value(quick_xml::XmlVersion::Implicit1_0)
                    .ok()
            })
            .map(|value| value.into_owned())
    }

    let mut reader = Reader::from_str(xml);
    let mut methods = std::collections::BTreeSet::new();
    let mut interface: Option<String> = None;

    loop {
        match reader.read_event() {
            Ok(Event::Eof) => break,

            Ok(Event::Start(element)) | Ok(Event::Empty(element)) => {
                match element.name().as_ref() {
                    b"interface" => interface = attribute(&element, b"name"),
                    b"method" => {
                        // A method outside any interface is not addressable,
                        // so it is dropped rather than recorded namelessly.
                        if let (Some(interface), Some(method)) =
                            (&interface, attribute(&element, b"name"))
                        {
                            methods.insert(format!("{interface}.{method}"));
                        }
                    }
                    _ => {}
                }
            }

            Ok(Event::End(element)) if element.name().as_ref() == b"interface" => interface = None,

            Ok(_) => {}

            // A document that cannot be read is not "a device with no
            // capabilities" — that would quietly grey out every control on a
            // working device. Say so instead.
            Err(error) => {
                return Err(BackendError::Protocol(format!(
                    "could not read the introspection document: {error}"
                )))
            }
        }
    }

    Ok(methods)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Shaped exactly like what the daemon answers, down to the two forms a
    /// method takes.
    const SAMPLE: &str = r#"<!DOCTYPE node PUBLIC "-//freedesktop//DTD D-BUS Object Introspection 1.0//EN" "http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd">
<node>
  <interface name="org.freedesktop.DBus.Introspectable">
    <method name="Introspect">
      <arg direction="out" type="s"/>
    </method>
  </interface>
  <interface name="razer.device.misc">
    <method name="getDeviceName">
      <arg direction="out" type="s"/>
    </method>
    <method name="suspendDevice"/>
  </interface>
  <interface name="razer.device.lighting.chroma">
    <method name="setStatic">
      <arg direction="in" type="y"/>
    </method>
  </interface>
</node>"#;

    #[test]
    fn reads_both_forms_a_method_arrives_in() {
        let methods = parse_methods(SAMPLE).unwrap();

        // With arguments, so a start tag.
        assert!(methods.contains("razer.device.misc.getDeviceName"));
        // Without, so an empty element — the form that is easy to miss.
        assert!(methods.contains("razer.device.misc.suspendDevice"));
        assert!(methods.contains("razer.device.lighting.chroma.setStatic"));
    }

    #[test]
    fn keeps_each_method_with_the_interface_it_belongs_to() {
        let methods = parse_methods(SAMPLE).unwrap();

        // ⚠️ The interface has to be cleared at its closing tag. Left set, the
        // next interface's methods would be filed under the previous one and
        // every capability lookup after the first would silently miss.
        assert!(!methods.contains("razer.device.misc.setStatic"));
        assert!(methods.contains("org.freedesktop.DBus.Introspectable.Introspect"));
    }

    #[test]
    fn a_device_publishing_no_interfaces_has_no_methods() {
        assert!(parse_methods("<node></node>").unwrap().is_empty());
    }

    #[test]
    fn a_document_that_cannot_be_read_is_an_error_not_an_empty_device() {
        // Answering "no capabilities" here would grey out every control on a
        // working device and look like the hardware's fault.
        assert!(parse_methods("<node><interface name=").is_err());
    }
}
