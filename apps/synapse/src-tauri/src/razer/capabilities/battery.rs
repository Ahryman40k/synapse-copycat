use crate::razer::{
    backend::{BackendError, DeviceBackend},
    capability::{BoxFuture, Capability},
    request::CapabilityResponse,
};

pub struct GetBatteryLevel;
pub struct IsCharging;

impl Capability for GetBatteryLevel {
    fn execute<'a>(self: Box<Self>, backend: &'a dyn DeviceBackend, serial: &'a str) -> BoxFuture<'a, Result<CapabilityResponse, BackendError>> {
        Box::pin(async move {
            Ok(CapabilityResponse::Float(backend.get_battery_level(serial).await?))
        })
    }
}

impl Capability for IsCharging {
    fn execute<'a>(self: Box<Self>, backend: &'a dyn DeviceBackend, serial: &'a str) -> BoxFuture<'a, Result<CapabilityResponse, BackendError>> {
        Box::pin(async move {
            Ok(CapabilityResponse::Bool(backend.is_charging(serial).await?))
        })
    }
}
