//! What is out there, across every protocol the application speaks.
//!
//! One place rather than a branch in each command: a participant is a
//! participant whether it arrived over DBus or over UDP, and the interface
//! must not have to know which. The protocol libraries in `libs/` do the
//! talking; this turns what they find into participants.

use std::net::Ipv4Addr;
use std::time::Duration;

use serde::Serialize;

use crate::capability::TwinklyPool;
use crate::razer::engine::group::ParticipantId;

/// How long a sweep listens. Long enough for a device that is busy drawing,
/// short enough that a first run does not look frozen.
const DISCOVERY_WINDOW: Duration = Duration::from_secs(2);

/// A Twinkly, as the interface needs it.
///
/// `PartialEq` because the watcher diffs sweeps: an event goes out only when
/// the list actually changed.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct TwinklyDevice {
    /// `twinkly-1c9dc285dd79`.
    pub participant: ParticipantId,
    pub name: String,
    pub address: String,
    /// `TWS050STQ`. Empty when the device answered discovery but not HTTP.
    pub product_code: String,
    pub leds: u16,
    /// `RGB` or `RGBW` — four bytes per LED rather than three.
    pub profile: String,
}

/// A participant identifier that survives a change of address.
///
/// The MAC and not the IP: a device that takes a new lease overnight is the
/// same device, and a group that named it by address would quietly lose it.
/// The prefix is what tells the engine which protocol to reach for later —
/// nothing else may read it, which is the whole point of `ParticipantId` being
/// opaque.
pub fn participant_id(mac: &str) -> ParticipantId {
    format!("twinkly-{}", mac.replace(':', "").to_lowercase())
}

/// Sweep the network and ask whatever answers what it is.
///
/// ⚠️ A device that answers discovery but not HTTP is still reported, with the
/// fields it could not supply left empty. It exists, the user can see it, and
/// saying nothing about it would look like the application had missed it.
///
/// A sweep that could not even run is an `Err`, distinct from an empty
/// network: the watcher must not read a failed socket as "everything left".
pub async fn twinkly_devices(pool: &TwinklyPool) -> Result<Vec<TwinklyDevice>, twinkly::Error> {
    let found = twinkly::discover(DISCOVERY_WINDOW).await?;

    let described = found
        .into_iter()
        .map(|device| async move { describe(pool, device.address, device.name).await });

    Ok(futures::future::join_all(described)
        .await
        .into_iter()
        .flatten()
        .collect())
}

async fn describe(pool: &TwinklyPool, address: Ipv4Addr, name: String) -> Option<TwinklyDevice> {
    let described = match twinkly::Device::new(address).gestalt().await {
        Ok(gestalt) => TwinklyDevice {
            participant: participant_id(&gestalt.mac),
            name: gestalt.device_name,
            address: address.to_string(),
            product_code: gestalt.product_code,
            leds: gestalt.number_of_led,
            profile: gestalt.led_profile,
        },
        Err(error) => {
            eprintln!("warn: {address} answered discovery but not HTTP — {error}");
            // No MAC, so no stable identifier: the address has to stand in, and
            // the participant will change name if the lease does.
            TwinklyDevice {
                participant: format!("twinkly-at-{address}"),
                name,
                address: address.to_string(),
                product_code: String::new(),
                leds: 0,
                profile: String::new(),
            }
        }
    };

    // Both branches, deliberately: even a device that refused HTTP just now
    // gets its address remembered, so a later capability tries the network
    // rather than answering "never seen" about something on the screen.
    pool.remember(described.participant.clone(), address).await;
    Some(described)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keys_a_participant_by_its_mac() {
        // Stable across a change of address, which an IP is not.
        assert_eq!(participant_id("1C:9D:C2:85:DD:79"), "twinkly-1c9dc285dd79");
    }
}
