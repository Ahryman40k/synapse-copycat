use std::net::Ipv4Addr;
use std::time::Duration;

use serde::Deserialize;

use crate::error::{Error, Result};

/// What a device says about itself.
///
/// Only the fields something here actually needs. The endpoint returns a good
/// deal more — flash size, uptime, a measured frame rate — and adding a field
/// for each would be a contract to keep for no reader.
#[derive(Debug, Clone, Deserialize)]
pub struct Gestalt {
    /// `Twinkly_85DD79` — the same name discovery reports.
    pub device_name: String,
    /// `TWS050STQ`, which encodes the string length and generation.
    pub product_code: String,
    pub hardware_version: String,
    /// How many LEDs are on the string. 50 on the one this was written against.
    pub number_of_led: u16,
    /// `RGB` or `RGBW`. A W channel means four bytes per LED, not three.
    pub led_profile: String,
    /// Bytes the device expects per LED, which is what a frame has to match.
    pub bytes_per_led: u8,
    /// The MAC, which is the only identifier that survives a change of address.
    pub mac: String,
    pub uuid: String,
}

/// One Twinkly, at an address.
///
/// Holds no session: `Gestalt` needs no authentication, and everything that
/// does will take a token this does not have yet.
#[derive(Debug, Clone)]
pub struct Device {
    address: Ipv4Addr,
    client: reqwest::Client,
}

impl Device {
    pub fn new(address: Ipv4Addr) -> Self {
        Self {
            address,
            client: reqwest::Client::builder()
                // A device on the local network either answers at once or is
                // not there. Waiting thirty seconds for one is a hung
                // interface, not patience.
                .timeout(Duration::from_secs(3))
                .build()
                .unwrap_or_default(),
        }
    }

    pub fn address(&self) -> Ipv4Addr {
        self.address
    }

    /// Ask the device what it is.
    ///
    /// The one call that needs no token, which is what makes it the right
    /// question to ask a freshly discovered address.
    pub async fn gestalt(&self) -> Result<Gestalt> {
        let body = self
            .client
            .get(format!("http://{}/xled/v1/gestalt", self.address))
            .send()
            .await?
            .text()
            .await?;

        serde_json::from_str(&body).map_err(|error| Error::Unexpected {
            address: self.address,
            // The body, not just the parse error: at this point the usual cause
            // is that the address is some other device's web server, and seeing
            // what it actually said is the whole diagnosis.
            detail: format!("{error} — body was {:.200}", body),
        })
    }
}
