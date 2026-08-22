use async_trait::async_trait;
use crate::{
    backend::{BackendError, DeviceBackend},
    capability::Capability,
    request::CapabilityResponse,
};

// ── brightness ────────────────────────────────────────────────────────────────

pub struct GetBrightness;
pub struct SetBrightness { pub value: f64 }

#[async_trait]
impl Capability for GetBrightness {
    async fn execute(self: Box<Self>, backend: &dyn DeviceBackend, serial: &str) -> Result<CapabilityResponse, BackendError> {
        Ok(CapabilityResponse::Float(backend.get_brightness(serial).await?))
    }
}

#[async_trait]
impl Capability for SetBrightness {
    async fn execute(self: Box<Self>, backend: &dyn DeviceBackend, serial: &str) -> Result<CapabilityResponse, BackendError> {
        backend.set_brightness(serial, self.value).await?;
        Ok(CapabilityResponse::Ok)
    }
}

// ── chroma ────────────────────────────────────────────────────────────────────

pub struct SetChromaStatic  { pub r: u8, pub g: u8, pub b: u8 }
pub struct SetChromaSpectrum;
pub struct SetChromaWave    { pub direction: i32 }
pub struct SetChromaBreath  { pub r: u8, pub g: u8, pub b: u8 }
pub struct SetChromaNone;

#[async_trait]
impl Capability for SetChromaStatic {
    async fn execute(self: Box<Self>, backend: &dyn DeviceBackend, serial: &str) -> Result<CapabilityResponse, BackendError> {
        backend.set_chroma_static(serial, self.r, self.g, self.b).await?;
        Ok(CapabilityResponse::Ok)
    }
}

#[async_trait]
impl Capability for SetChromaSpectrum {
    async fn execute(self: Box<Self>, backend: &dyn DeviceBackend, serial: &str) -> Result<CapabilityResponse, BackendError> {
        backend.set_chroma_spectrum(serial).await?;
        Ok(CapabilityResponse::Ok)
    }
}

#[async_trait]
impl Capability for SetChromaWave {
    async fn execute(self: Box<Self>, backend: &dyn DeviceBackend, serial: &str) -> Result<CapabilityResponse, BackendError> {
        backend.set_chroma_wave(serial, self.direction).await?;
        Ok(CapabilityResponse::Ok)
    }
}

#[async_trait]
impl Capability for SetChromaBreath {
    async fn execute(self: Box<Self>, backend: &dyn DeviceBackend, serial: &str) -> Result<CapabilityResponse, BackendError> {
        backend.set_chroma_breath(serial, self.r, self.g, self.b).await?;
        Ok(CapabilityResponse::Ok)
    }
}

#[async_trait]
impl Capability for SetChromaNone {
    async fn execute(self: Box<Self>, backend: &dyn DeviceBackend, serial: &str) -> Result<CapabilityResponse, BackendError> {
        backend.set_chroma_none(serial).await?;
        Ok(CapabilityResponse::Ok)
    }
}
