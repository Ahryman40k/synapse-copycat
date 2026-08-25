use std::collections::HashMap;
use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use std::time::Duration;

use tokio::net::UdpSocket;

use crate::error::Result;

/// The port a Twinkly listens on for discovery, and answers from.
const DISCOVERY_PORT: u16 = 5555;

/// What every Twinkly answers to. Undocumented by the vendor; this is the
/// payload the community's reverse engineering settled on, and it is what the
/// device on the bench replies to.
const PROBE: &[u8] = b"\x01discover";

/// A device that answered.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Discovered {
    pub address: Ipv4Addr,
    /// The name the device calls itself, e.g. `Twinkly_85DD79`.
    pub name: String,
}

/// Read a discovery reply.
///
/// The shape, confirmed against a `TWS050STQ` answering
/// `c9 01 a8 c0 4f 4b 54 77 ...`:
///
/// - four bytes of IPv4 **in reverse order** — `c9 01 a8 c0` is 192.168.1.201,
///   not 201.1.168.192;
/// - the two bytes `OK`;
/// - the device name, NUL-terminated.
///
/// Returns `None` rather than an error for anything that does not match: a
/// discovery sweep touches every address on the subnet and will hear from
/// things that are not Twinklys, which is ordinary and not a fault.
pub fn decode_reply(payload: &[u8]) -> Option<Discovered> {
    if payload.len() < 6 || &payload[4..6] != b"OK" {
        return None;
    }

    let address = Ipv4Addr::new(payload[3], payload[2], payload[1], payload[0]);

    let name = payload[6..]
        .iter()
        .take_while(|byte| **byte != 0)
        .copied()
        .collect::<Vec<u8>>();

    Some(Discovered {
        address,
        name: String::from_utf8_lossy(&name).into_owned(),
    })
}

/// Find the Twinklys on the local network.
///
/// ⚠️ **Both a broadcast and a unicast sweep**, and the sweep is not a
/// belt-and-braces extra. Measured on the development machine — WSL2 in
/// `mirrored` networking mode, which has a real address on the LAN — a
/// broadcast to `x.x.x.255:5555` gets no reply at all, while the identical
/// datagram sent straight to the device is answered every time. The broadcast
/// never leaves the host. Any interface behind a NAT, a bridge or a firewall
/// that drops broadcast will look the same, and a discovery that only
/// broadcasts reports "no devices" on a network full of them.
///
/// The sweep costs 254 datagrams of nine bytes. That is nothing next to being
/// wrong.
pub async fn discover(timeout: Duration) -> Result<Vec<Discovered>> {
    let socket = UdpSocket::bind(("0.0.0.0", 0)).await?;
    socket.set_broadcast(true)?;

    let local = local_address(&socket)?;

    // Broadcast first: on a network where it works, the answer arrives before
    // the sweep has finished being sent.
    let _ = socket
        .send_to(
            PROBE,
            SocketAddr::from((broadcast_for(local), DISCOVERY_PORT)),
        )
        .await;

    for host in 1..=254u8 {
        let target = Ipv4Addr::new(
            local.octets()[0],
            local.octets()[1],
            local.octets()[2],
            host,
        );
        // A refusal on one address says nothing about the rest — an unreachable
        // host is the ordinary case in a sweep.
        let _ = socket
            .send_to(PROBE, SocketAddr::from((target, DISCOVERY_PORT)))
            .await;
    }

    Ok(collect(&socket, timeout).await)
}

/// Ask one address directly. Used when the address is already known — a device
/// remembered from a previous run does not need the subnet swept for it.
pub async fn probe(address: Ipv4Addr, timeout: Duration) -> Result<Option<Discovered>> {
    let socket = UdpSocket::bind(("0.0.0.0", 0)).await?;
    socket
        .send_to(PROBE, SocketAddr::from((address, DISCOVERY_PORT)))
        .await?;

    Ok(collect(&socket, timeout).await.into_iter().next())
}

/// Gather replies until the window closes, keeping one per address.
async fn collect(socket: &UdpSocket, timeout: Duration) -> Vec<Discovered> {
    let mut found: HashMap<Ipv4Addr, Discovered> = HashMap::new();
    let deadline = tokio::time::Instant::now() + timeout;
    let mut buffer = [0u8; 256];

    loop {
        let remaining = deadline.saturating_duration_since(tokio::time::Instant::now());
        if remaining.is_zero() {
            break;
        }

        match tokio::time::timeout(remaining, socket.recv_from(&mut buffer)).await {
            // The window closed, which is how a sweep ends rather than a fault.
            Err(_) => break,
            Ok(Err(_)) => continue,
            Ok(Ok((read, from))) => {
                // Our own probe, heard back from the broadcast.
                if &buffer[..read] == PROBE {
                    continue;
                }

                if let Some(device) = decode_reply(&buffer[..read]) {
                    // Keyed by where the datagram came from, not by what the
                    // payload claims: the payload is the device's own idea of
                    // its address, and behind any translation the two differ.
                    let address = match from.ip() {
                        IpAddr::V4(address) => address,
                        IpAddr::V6(_) => continue,
                    };
                    found.insert(address, Discovered { address, ..device });
                }
            }
        }
    }

    let mut devices: Vec<Discovered> = found.into_values().collect();
    devices.sort_by_key(|device| device.address);
    devices
}

/// The address this host uses to reach the LAN.
///
/// Read from a connected UDP socket rather than by enumerating interfaces: no
/// datagram is sent, the kernel simply says which source address it would pick,
/// and it needs no platform-specific code or extra dependency.
fn local_address(socket: &UdpSocket) -> Result<Ipv4Addr> {
    // Any routable address will do; nothing is sent to it.
    socket.connect_probe()
}

/// The subnet broadcast for an address, assuming a /24.
///
/// ⚠️ A guess, and the reason the sweep exists beside it. Home networks are
/// almost always /24, but nothing here reads the actual prefix — a /16 would be
/// swept as if it were a /24 and the far half of it never asked.
fn broadcast_for(local: Ipv4Addr) -> Ipv4Addr {
    let [a, b, c, _] = local.octets();
    Ipv4Addr::new(a, b, c, 255)
}

trait ConnectProbe {
    fn connect_probe(&self) -> Result<Ipv4Addr>;
}

impl ConnectProbe for UdpSocket {
    fn connect_probe(&self) -> Result<Ipv4Addr> {
        let probe = std::net::UdpSocket::bind(("0.0.0.0", 0))?;
        // A routable address that is never contacted: `connect` on a datagram
        // socket only fixes the peer, it sends nothing.
        probe.connect(("192.0.2.1", 9))?;

        match probe.local_addr()?.ip() {
            IpAddr::V4(address) => Ok(address),
            IpAddr::V6(_) => Err(crate::error::Error::Network(
                "no IPv4 route to the local network".into(),
            )),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The exact bytes the device on the bench replied with.
    const REAL_REPLY: &[u8] = b"\xc9\x01\xa8\xc0OKTwinkly_85DD79\x00";

    #[test]
    fn reads_a_real_reply() {
        let device = decode_reply(REAL_REPLY).expect("a Twinkly reply");

        assert_eq!(device.address, Ipv4Addr::new(192, 168, 1, 201));
        assert_eq!(device.name, "Twinkly_85DD79");
    }

    #[test]
    fn reads_the_address_backwards() {
        // The octets arrive reversed. Reading them forwards gives 201.1.168.192,
        // which is a perfectly plausible-looking address on someone else's
        // network — the kind of wrong that does not announce itself.
        let device = decode_reply(b"\x0a\x00\x00\x7f\x4fK\x4b").expect("a reply");
        assert_eq!(device.address, Ipv4Addr::new(127, 0, 0, 10));
    }

    #[test]
    fn stops_the_name_at_the_terminator() {
        let device = decode_reply(b"\x01\x01\xa8\xc0OKName\x00rubbish").expect("a reply");
        assert_eq!(device.name, "Name");
    }

    #[test]
    fn takes_a_name_that_runs_to_the_end() {
        // Nothing guarantees the terminator is there.
        let device = decode_reply(b"\x01\x01\xa8\xc0OKName").expect("a reply");
        assert_eq!(device.name, "Name");
    }

    #[test]
    fn ignores_anything_that_is_not_a_twinkly() {
        // A sweep touches every address on the subnet, so hearing from
        // something else is ordinary and must not read as an error.
        assert!(decode_reply(b"").is_none());
        assert!(decode_reply(b"\x01\x01\xa8\xc0").is_none());
        assert!(decode_reply(b"\x01\x01\xa8\xc0NOsomething").is_none());
    }

    #[test]
    fn ignores_our_own_probe_heard_back() {
        assert!(decode_reply(PROBE).is_none());
    }

    #[test]
    fn broadcasts_to_the_subnet() {
        assert_eq!(
            broadcast_for(Ipv4Addr::new(192, 168, 1, 76)),
            Ipv4Addr::new(192, 168, 1, 255)
        );
    }
}
