use std::net::Ipv4Addr;

/// Everything that can go wrong talking to a Twinkly.
#[derive(Debug, thiserror::Error)]
pub enum Error {
    /// The network refused, or nothing answered in time.
    #[error("network error: {0}")]
    Network(String),

    /// It answered, but not with what the protocol says.
    ///
    /// Kept apart from `Network` on purpose: one means the device is
    /// unreachable and the other means our reading of the protocol is wrong,
    /// and those call for very different responses.
    #[error("{address} answered something unexpected: {detail}")]
    Unexpected {
        address: Ipv4Addr,
        detail: String,
    },
}

impl From<reqwest::Error> for Error {
    fn from(error: reqwest::Error) -> Self {
        Self::Network(error.to_string())
    }
}

impl From<std::io::Error> for Error {
    fn from(error: std::io::Error) -> Self {
        Self::Network(error.to_string())
    }
}

pub type Result<T> = std::result::Result<T, Error>;
