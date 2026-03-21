use crate::razer::{
    backend::{BackendError, DeviceBackend},
    capability::{BoxFuture, Capability},
    request::CapabilityResponse,
};

pub struct GetDpi;
pub struct SetDpi    { pub x: i32, pub y: i32 }
pub struct GetMaxDpi;

impl Capability for GetDpi {
    fn execute<'a>(self: Box<Self>, backend: &'a dyn DeviceBackend, serial: &'a str) -> BoxFuture<'a, Result<CapabilityResponse, BackendError>> {
        Box::pin(async move {
            let (x, y) = backend.get_dpi(serial).await?;
            Ok(CapabilityResponse::IntPair(x, y))
        })
    }
}

impl Capability for SetDpi {
    fn execute<'a>(self: Box<Self>, backend: &'a dyn DeviceBackend, serial: &'a str) -> BoxFuture<'a, Result<CapabilityResponse, BackendError>> {
        Box::pin(async move {
            backend.set_dpi(serial, self.x, self.y).await?;
            Ok(CapabilityResponse::Ok)
        })
    }
}

impl Capability for GetMaxDpi {
    fn execute<'a>(self: Box<Self>, backend: &'a dyn DeviceBackend, serial: &'a str) -> BoxFuture<'a, Result<CapabilityResponse, BackendError>> {
        Box::pin(async move {
            Ok(CapabilityResponse::Int(backend.get_max_dpi(serial).await?))
        })
    }
}
