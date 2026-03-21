use crate::razer::{
    backend::{BackendError, DeviceBackend},
    capability::{BoxFuture, Capability},
    request::CapabilityResponse,
};

pub struct GetBrightness;
pub struct SetBrightness    { pub value: f64 }
pub struct SetChromaStatic  { pub r: u8, pub g: u8, pub b: u8 }
pub struct SetChromaSpectrum;
pub struct SetChromaWave    { pub direction: i32 }
pub struct SetChromaBreath  { pub r: u8, pub g: u8, pub b: u8 }
pub struct SetChromaNone;

impl Capability for GetBrightness {
    fn execute<'a>(self: Box<Self>, backend: &'a dyn DeviceBackend, serial: &'a str) -> BoxFuture<'a, Result<CapabilityResponse, BackendError>> {
        Box::pin(async move {
            Ok(CapabilityResponse::Float(backend.get_brightness(serial).await?))
        })
    }
}

impl Capability for SetBrightness {
    fn execute<'a>(self: Box<Self>, backend: &'a dyn DeviceBackend, serial: &'a str) -> BoxFuture<'a, Result<CapabilityResponse, BackendError>> {
        Box::pin(async move {
            backend.set_brightness(serial, self.value).await?;
            Ok(CapabilityResponse::Ok)
        })
    }
}

impl Capability for SetChromaStatic {
    fn execute<'a>(self: Box<Self>, backend: &'a dyn DeviceBackend, serial: &'a str) -> BoxFuture<'a, Result<CapabilityResponse, BackendError>> {
        Box::pin(async move {
            backend.set_chroma_static(serial, self.r, self.g, self.b).await?;
            Ok(CapabilityResponse::Ok)
        })
    }
}

impl Capability for SetChromaSpectrum {
    fn execute<'a>(self: Box<Self>, backend: &'a dyn DeviceBackend, serial: &'a str) -> BoxFuture<'a, Result<CapabilityResponse, BackendError>> {
        Box::pin(async move {
            backend.set_chroma_spectrum(serial).await?;
            Ok(CapabilityResponse::Ok)
        })
    }
}

impl Capability for SetChromaWave {
    fn execute<'a>(self: Box<Self>, backend: &'a dyn DeviceBackend, serial: &'a str) -> BoxFuture<'a, Result<CapabilityResponse, BackendError>> {
        Box::pin(async move {
            backend.set_chroma_wave(serial, self.direction).await?;
            Ok(CapabilityResponse::Ok)
        })
    }
}

impl Capability for SetChromaBreath {
    fn execute<'a>(self: Box<Self>, backend: &'a dyn DeviceBackend, serial: &'a str) -> BoxFuture<'a, Result<CapabilityResponse, BackendError>> {
        Box::pin(async move {
            backend.set_chroma_breath(serial, self.r, self.g, self.b).await?;
            Ok(CapabilityResponse::Ok)
        })
    }
}

impl Capability for SetChromaNone {
    fn execute<'a>(self: Box<Self>, backend: &'a dyn DeviceBackend, serial: &'a str) -> BoxFuture<'a, Result<CapabilityResponse, BackendError>> {
        Box::pin(async move {
            backend.set_chroma_none(serial).await?;
            Ok(CapabilityResponse::Ok)
        })
    }
}
