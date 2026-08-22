#![cfg(target_os = "windows")]

use reqwest::{Client, StatusCode};
use serde::Deserialize;
use std::future::Future;
use std::pin::Pin;

use super::{BackendError, DeviceBackend};

type BoxFuture<'a, T> = Pin<Box<dyn Future<Output = T> + Send + 'a>>;

// ─── REST response shapes ─────────────────────────────────────────────────────

#[derive(Deserialize)]
struct StringResponse {
    value: String,
}
#[derive(Deserialize)]
struct IntResponse {
    value: i32,
}
#[derive(Deserialize)]
struct FloatResponse {
    value: f64,
}
#[derive(Deserialize)]
struct BoolResponse {
    value: bool,
}
#[derive(Deserialize)]
struct PairResponse {
    x: i32,
    y: i32,
}
#[derive(Deserialize)]
struct VidPidResponse {
    vid: i32,
    pid: i32,
}
#[derive(Deserialize)]
struct DeviceList {
    serials: Vec<String>,
}

// ─── RestBackend ──────────────────────────────────────────────────────────────

pub struct RestBackend {
    client: Client,
    base_url: String,
}

impl RestBackend {
    pub fn new(base_url: impl Into<String>) -> Self {
        Self {
            client: Client::new(),
            base_url: base_url.into(),
        }
    }

    fn url(&self, path: &str) -> String {
        format!("{}{}", self.base_url, path)
    }

    fn device_url(&self, serial: &str, endpoint: &str) -> String {
        self.url(&format!("/devices/{}/{}", serial, endpoint))
    }

    async fn get<T: for<'de> Deserialize<'de>>(&self, url: String) -> Result<T, BackendError> {
        let resp = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| BackendError::Transport(e.to_string()))?;
        match resp.status() {
            StatusCode::NOT_FOUND => return Err(BackendError::DeviceNotFound(url)),
            StatusCode::METHOD_NOT_ALLOWED => return Err(BackendError::InterfaceUnsupported(url)),
            s if !s.is_success() => return Err(BackendError::Protocol(format!("HTTP {}", s))),
            _ => {}
        }
        resp.json::<T>()
            .await
            .map_err(|e| BackendError::Transport(e.to_string()))
    }

    async fn post<B: serde::Serialize>(&self, url: String, body: &B) -> Result<(), BackendError> {
        let resp = self
            .client
            .post(&url)
            .json(body)
            .send()
            .await
            .map_err(|e| BackendError::Transport(e.to_string()))?;
        match resp.status() {
            StatusCode::NOT_FOUND => Err(BackendError::DeviceNotFound(url)),
            StatusCode::METHOD_NOT_ALLOWED => Err(BackendError::InterfaceUnsupported(url)),
            s if !s.is_success() => Err(BackendError::Protocol(format!("HTTP {}", s))),
            _ => Ok(()),
        }
    }
}

impl DeviceBackend for RestBackend {
    fn list_devices(&self) -> BoxFuture<'_, Result<Vec<String>, BackendError>> {
        Box::pin(async move {
            let r: DeviceList = self.get(self.url("/devices")).await?;
            Ok(r.serials)
        })
    }

    fn get_device_name(&self, serial: &str) -> BoxFuture<'_, Result<String, BackendError>> {
        let url = self.device_url(serial, "name");
        Box::pin(async move {
            let r: StringResponse = self.get(url).await?;
            Ok(r.value)
        })
    }

    fn get_device_type(&self, serial: &str) -> BoxFuture<'_, Result<String, BackendError>> {
        let url = self.device_url(serial, "type");
        Box::pin(async move {
            let r: StringResponse = self.get(url).await?;
            Ok(r.value)
        })
    }

    fn get_serial(&self, serial: &str) -> BoxFuture<'_, Result<String, BackendError>> {
        let url = self.device_url(serial, "serial");
        Box::pin(async move {
            let r: StringResponse = self.get(url).await?;
            Ok(r.value)
        })
    }

    fn get_vid_pid(&self, serial: &str) -> BoxFuture<'_, Result<(i32, i32), BackendError>> {
        let url = self.device_url(serial, "vidpid");
        Box::pin(async move {
            let r: VidPidResponse = self.get(url).await?;
            Ok((r.vid, r.pid))
        })
    }

    fn suspend_device(&self, serial: &str) -> BoxFuture<'_, Result<(), BackendError>> {
        let url = self.device_url(serial, "suspend");
        Box::pin(async move { self.post(url, &()).await })
    }

    fn resume_device(&self, serial: &str) -> BoxFuture<'_, Result<(), BackendError>> {
        let url = self.device_url(serial, "resume");
        Box::pin(async move { self.post(url, &()).await })
    }

    fn get_dpi(&self, serial: &str) -> BoxFuture<'_, Result<(i32, i32), BackendError>> {
        let url = self.device_url(serial, "dpi");
        Box::pin(async move {
            let r: PairResponse = self.get(url).await?;
            Ok((r.x, r.y))
        })
    }

    fn set_dpi(&self, serial: &str, x: i32, y: i32) -> BoxFuture<'_, Result<(), BackendError>> {
        let url = self.device_url(serial, "dpi");
        Box::pin(async move { self.post(url, &serde_json::json!({ "x": x, "y": y })).await })
    }

    fn get_max_dpi(&self, serial: &str) -> BoxFuture<'_, Result<i32, BackendError>> {
        let url = self.device_url(serial, "dpi/max");
        Box::pin(async move {
            let r: IntResponse = self.get(url).await?;
            Ok(r.value)
        })
    }

    fn get_brightness(&self, serial: &str) -> BoxFuture<'_, Result<f64, BackendError>> {
        let url = self.device_url(serial, "lighting/brightness");
        Box::pin(async move {
            let r: FloatResponse = self.get(url).await?;
            Ok(r.value)
        })
    }

    fn set_brightness(&self, serial: &str, value: f64) -> BoxFuture<'_, Result<(), BackendError>> {
        let url = self.device_url(serial, "lighting/brightness");
        Box::pin(async move { self.post(url, &serde_json::json!({ "value": value })).await })
    }

    fn set_chroma_static(
        &self,
        serial: &str,
        r: u8,
        g: u8,
        b: u8,
    ) -> BoxFuture<'_, Result<(), BackendError>> {
        let url = self.device_url(serial, "lighting/chroma/static");
        Box::pin(async move {
            self.post(url, &serde_json::json!({ "r": r, "g": g, "b": b }))
                .await
        })
    }

    fn set_chroma_spectrum(&self, serial: &str) -> BoxFuture<'_, Result<(), BackendError>> {
        let url = self.device_url(serial, "lighting/chroma/spectrum");
        Box::pin(async move { self.post(url, &()).await })
    }

    fn set_chroma_wave(
        &self,
        serial: &str,
        direction: i32,
    ) -> BoxFuture<'_, Result<(), BackendError>> {
        let url = self.device_url(serial, "lighting/chroma/wave");
        Box::pin(async move {
            self.post(url, &serde_json::json!({ "direction": direction }))
                .await
        })
    }

    fn set_chroma_breath(
        &self,
        serial: &str,
        r: u8,
        g: u8,
        b: u8,
    ) -> BoxFuture<'_, Result<(), BackendError>> {
        let url = self.device_url(serial, "lighting/chroma/breath");
        Box::pin(async move {
            self.post(url, &serde_json::json!({ "r": r, "g": g, "b": b }))
                .await
        })
    }

    fn set_chroma_none(&self, serial: &str) -> BoxFuture<'_, Result<(), BackendError>> {
        let url = self.device_url(serial, "lighting/chroma/none");
        Box::pin(async move { self.post(url, &()).await })
    }

    fn get_battery_level(&self, serial: &str) -> BoxFuture<'_, Result<f64, BackendError>> {
        let url = self.device_url(serial, "battery/level");
        Box::pin(async move {
            let r: FloatResponse = self.get(url).await?;
            Ok(r.value)
        })
    }

    fn is_charging(&self, serial: &str) -> BoxFuture<'_, Result<bool, BackendError>> {
        let url = self.device_url(serial, "battery/charging");
        Box::pin(async move {
            let r: BoolResponse = self.get(url).await?;
            Ok(r.value)
        })
    }

    // ── the custom matrix ─────────────────────────────────────────────────────
    //
    // Not offered. The rendering engine draws frame by frame, which means a
    // round trip per row many times a second; over HTTP that is not a slow
    // path, it is the wrong shape entirely. A Windows host runs hardware
    // effects until this backend grows something built for streaming.

    fn has_matrix(&self, _serial: &str) -> BoxFuture<'_, Result<bool, BackendError>> {
        Box::pin(async { Ok(false) })
    }

    fn matrix_dimensions(&self, _serial: &str) -> BoxFuture<'_, Result<(u8, u8), BackendError>> {
        Box::pin(async { Ok((0, 0)) })
    }

    fn set_key_row(
        &self,
        serial: &str,
        _payload: Vec<u8>,
    ) -> BoxFuture<'_, Result<(), BackendError>> {
        let serial = serial.to_owned();
        Box::pin(async move { Err(BackendError::InterfaceUnsupported(serial)) })
    }

    fn show_custom_frame(&self, serial: &str) -> BoxFuture<'_, Result<(), BackendError>> {
        let serial = serial.to_owned();
        Box::pin(async move { Err(BackendError::InterfaceUnsupported(serial)) })
    }
}
