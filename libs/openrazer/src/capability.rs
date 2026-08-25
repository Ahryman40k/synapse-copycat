use crate::{
    backend::{BackendError, DeviceBackend},
    request::CapabilityResponse,
};
use std::future::Future;
use std::pin::Pin;

pub type BoxFuture<'a, T> = Pin<Box<dyn Future<Output = T> + Send + 'a>>;

pub trait Capability: Send {
    fn execute<'a>(
        self: Box<Self>,
        backend: &'a dyn DeviceBackend,
        serial: &'a str,
    ) -> BoxFuture<'a, Result<CapabilityResponse, BackendError>>;
}
