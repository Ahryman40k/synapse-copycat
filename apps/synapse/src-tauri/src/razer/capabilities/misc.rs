use crate::razer::{
    backend::{BackendError, DeviceBackend},
    capability::{BoxFuture, Capability},
    request::CapabilityResponse,
};

pub struct GetDeviceName;
pub struct GetDeviceType;
pub struct GetSerial;
pub struct GetVidPid;
pub struct SuspendDevice;
pub struct ResumeDevice;
pub struct GetDeviceImage;

impl Capability for GetDeviceName {
    fn execute<'a>(
        self: Box<Self>,
        backend: &'a dyn DeviceBackend,
        serial: &'a str,
    ) -> BoxFuture<'a, Result<CapabilityResponse, BackendError>> {
        Box::pin(async move {
            Ok(CapabilityResponse::String(
                backend.get_device_name(serial).await?,
            ))
        })
    }
}

impl Capability for GetDeviceType {
    fn execute<'a>(
        self: Box<Self>,
        backend: &'a dyn DeviceBackend,
        serial: &'a str,
    ) -> BoxFuture<'a, Result<CapabilityResponse, BackendError>> {
        Box::pin(async move {
            Ok(CapabilityResponse::String(
                backend.get_device_type(serial).await?,
            ))
        })
    }
}

impl Capability for GetSerial {
    fn execute<'a>(
        self: Box<Self>,
        backend: &'a dyn DeviceBackend,
        serial: &'a str,
    ) -> BoxFuture<'a, Result<CapabilityResponse, BackendError>> {
        Box::pin(async move {
            Ok(CapabilityResponse::String(
                backend.get_serial(serial).await?,
            ))
        })
    }
}

impl Capability for GetVidPid {
    fn execute<'a>(
        self: Box<Self>,
        backend: &'a dyn DeviceBackend,
        serial: &'a str,
    ) -> BoxFuture<'a, Result<CapabilityResponse, BackendError>> {
        Box::pin(async move {
            let (vid, pid) = backend.get_vid_pid(serial).await?;
            Ok(CapabilityResponse::VidPid { vid, pid })
        })
    }
}

impl Capability for SuspendDevice {
    fn execute<'a>(
        self: Box<Self>,
        backend: &'a dyn DeviceBackend,
        serial: &'a str,
    ) -> BoxFuture<'a, Result<CapabilityResponse, BackendError>> {
        Box::pin(async move {
            backend.suspend_device(serial).await?;
            Ok(CapabilityResponse::Ok)
        })
    }
}

impl Capability for ResumeDevice {
    fn execute<'a>(
        self: Box<Self>,
        backend: &'a dyn DeviceBackend,
        serial: &'a str,
    ) -> BoxFuture<'a, Result<CapabilityResponse, BackendError>> {
        Box::pin(async move {
            backend.resume_device(serial).await?;
            Ok(CapabilityResponse::Ok)
        })
    }
}

impl Capability for GetDeviceImage {
    fn execute<'a>(
        self: Box<Self>,
        backend: &'a dyn DeviceBackend,
        serial: &'a str,
    ) -> BoxFuture<'a, Result<CapabilityResponse, BackendError>> {
        Box::pin(async move {
            Ok(CapabilityResponse::String(
                backend.get_device_image(serial).await?,
            ))
        })
    }
}
