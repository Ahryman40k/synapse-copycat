use crate::razer::{
    backend::{BackendError, DeviceBackend},
    capability::Capability,
    request::{CapabilityRequest, CapabilityResponse},
};

pub async fn dispatch(
    backend: &dyn DeviceBackend,
    serial: &str,
    request: CapabilityRequest,
) -> Result<CapabilityResponse, BackendError> {
    let capability: Box<dyn Capability> = request.into();
    capability.execute(backend, serial).await
}
