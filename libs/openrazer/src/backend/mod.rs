use std::future::Future;
use std::pin::Pin;

use serde::Serialize;
use thiserror::Error;

#[cfg(target_os = "linux")]
pub mod dbus;

#[cfg(target_os = "windows")]
pub mod rest;

// ─── BackendError ─────────────────────────────────────────────────────────────

#[derive(Debug, Error, Serialize)]
pub enum BackendError {
    /// No daemon to talk to — not installed, not started, or on a bus this
    /// process cannot reach. Distinct from `Transport`, which is a live
    /// connection going wrong: this one means there was never a connection,
    /// and the frontend should say so rather than show an empty device list.
    #[error("The OpenRazer daemon is unavailable: {0}")]
    DaemonUnavailable(String),

    #[error("Device '{0}' does not support this capability")]
    InterfaceUnsupported(String),

    #[error("Device not found: {0}")]
    DeviceNotFound(String),

    #[error("Transport error: {0}")]
    Transport(String),

    #[error("Protocol error: {0}")]
    Protocol(String),
}

#[cfg(target_os = "linux")]
impl From<zbus::Error> for BackendError {
    fn from(e: zbus::Error) -> Self {
        match e {
            zbus::Error::InterfaceNotFound => BackendError::InterfaceUnsupported("unknown".into()),
            other => BackendError::Transport(other.to_string()),
        }
    }
}

#[cfg(target_os = "windows")]
impl From<reqwest::Error> for BackendError {
    fn from(e: reqwest::Error) -> Self {
        BackendError::Transport(e.to_string())
    }
}

// ─── Convenience alias ────────────────────────────────────────────────────────

/// A heap-allocated future that is Send — used as the return type for every
/// trait method so that `DeviceBackend` is dyn-compatible.
/// Without this, native `async fn` in traits produces an opaque `impl Future`
/// that the compiler cannot place behind a trait object.
type BoxFuture<'a, T> = Pin<Box<dyn Future<Output = T> + Send + 'a>>;

// ─── DeviceBackend trait ──────────────────────────────────────────────────────

/// The contract every platform backend must fulfil.
///
/// Methods return `BoxFuture` instead of `async fn` so the trait is
/// dyn-compatible and can be stored as `Box<dyn DeviceBackend>` in Tauri state.
/// In implementations use `async_trait::async_trait` — it rewrites `async fn`
/// into exactly this shape automatically.
pub trait DeviceBackend: Send + Sync + 'static {
    // ── daemon ────────────────────────────────────────────────────────────────
    fn list_devices(&self) -> BoxFuture<'_, Result<Vec<String>, BackendError>>;

    // ── misc ──────────────────────────────────────────────────────────────────
    fn get_device_name(&self, serial: &str) -> BoxFuture<'_, Result<String, BackendError>>;
    fn get_device_type(&self, serial: &str) -> BoxFuture<'_, Result<String, BackendError>>;
    fn get_serial(&self, serial: &str) -> BoxFuture<'_, Result<String, BackendError>>;
    fn get_vid_pid(&self, serial: &str) -> BoxFuture<'_, Result<(i32, i32), BackendError>>;
    fn suspend_device(&self, serial: &str) -> BoxFuture<'_, Result<(), BackendError>>;
    fn resume_device(&self, serial: &str) -> BoxFuture<'_, Result<(), BackendError>>;
    fn get_device_image(&self, serial: &str) -> BoxFuture<'_, Result<String, BackendError>>;

    // ── dpi ───────────────────────────────────────────────────────────────────
    fn get_dpi(&self, serial: &str) -> BoxFuture<'_, Result<(i32, i32), BackendError>>;
    fn set_dpi(&self, serial: &str, x: i32, y: i32) -> BoxFuture<'_, Result<(), BackendError>>;
    fn get_max_dpi(&self, serial: &str) -> BoxFuture<'_, Result<i32, BackendError>>;

    // ── lighting.brightness ───────────────────────────────────────────────────
    fn get_brightness(&self, serial: &str) -> BoxFuture<'_, Result<f64, BackendError>>;
    fn set_brightness(&self, serial: &str, value: f64) -> BoxFuture<'_, Result<(), BackendError>>;

    // ── lighting.chroma ───────────────────────────────────────────────────────
    fn set_chroma_static(
        &self,
        serial: &str,
        r: u8,
        g: u8,
        b: u8,
    ) -> BoxFuture<'_, Result<(), BackendError>>;
    fn set_chroma_spectrum(&self, serial: &str) -> BoxFuture<'_, Result<(), BackendError>>;
    fn set_chroma_wave(
        &self,
        serial: &str,
        direction: i32,
    ) -> BoxFuture<'_, Result<(), BackendError>>;
    fn set_chroma_breath(
        &self,
        serial: &str,
        r: u8,
        g: u8,
        b: u8,
    ) -> BoxFuture<'_, Result<(), BackendError>>;
    fn set_chroma_none(&self, serial: &str) -> BoxFuture<'_, Result<(), BackendError>>;

    // ── battery ───────────────────────────────────────────────────────────────
    fn get_battery_level(&self, serial: &str) -> BoxFuture<'_, Result<f64, BackendError>>;
    fn is_charging(&self, serial: &str) -> BoxFuture<'_, Result<bool, BackendError>>;

    // ── the custom matrix ─────────────────────────────────────────────────────
    //
    // What the rendering engine draws through. Not every device has one: a
    // Kraken answers false to `has_matrix` and publishes no `setKeyRow` at all,
    // so a headset can only ever run a hardware effect.

    fn has_matrix(&self, serial: &str) -> BoxFuture<'_, Result<bool, BackendError>>;

    /// Rows and columns, in that order.
    fn matrix_dimensions(&self, serial: &str) -> BoxFuture<'_, Result<(u8, u8), BackendError>>;

    /// Writes one row into the pending frame. Nothing shows until
    /// `show_custom_frame`; see `engine::frame::row_payload` for the encoding.
    ///
    /// The payload is owned rather than borrowed so the future does not hold a
    /// second lifetime — every other method here takes copies for the same
    /// reason.
    fn set_key_row(
        &self,
        serial: &str,
        payload: Vec<u8>,
    ) -> BoxFuture<'_, Result<(), BackendError>>;

    /// Shows the rows written so far, all at once. Drawing row by row without
    /// this would tear the picture as it is built.
    fn show_custom_frame(&self, serial: &str) -> BoxFuture<'_, Result<(), BackendError>>;
}
