use std::net::Ipv4Addr;
use std::sync::Arc;
use std::time::Duration;

use base64::Engine as _;
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use tokio::net::UdpSocket;
use tokio::sync::{Mutex, OnceCell};

use crate::error::{Error, Result};

/// Where real-time frames go. Not the HTTP port: raw UDP datagrams.
const REALTIME_PORT: u16 = 7777;

/// The largest slice of frame data one v3 datagram carries; larger frames are
/// fragmented. From xled-docs, which shows a 2250-byte frame split 900/900/450.
const REALTIME_FRAGMENT: usize = 900;

/// What the device is doing with its LEDs — `POST /xled/v1/led/mode`.
///
/// The full set from xled-docs, even though this library only ever *asks for*
/// `Off` and `Color`: a device queried while playing its own animation answers
/// `movie` or `playlist`, and refusing to parse that would turn an honest
/// answer into an error.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Mode {
    Off,
    Color,
    Demo,
    Effect,
    Movie,
    Playlist,
    Rt,
}

impl Mode {
    /// Anything but dark. `rt` counts: something is being streamed to it.
    pub fn is_lit(self) -> bool {
        self != Self::Off
    }
}

/// Every application-level reply carries this; anything else is a fault.
const CODE_OK: i64 = 1000;

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
/// Everything beyond `gestalt` needs a token, so the device carries one —
/// behind an `Arc`, which keeps `Clone` cheap and makes every clone share the
/// same session rather than each logging in behind the others' backs.
#[derive(Debug, Clone)]
pub struct Device {
    address: Ipv4Addr,
    client: reqwest::Client,
    /// `None` until the first authenticated call. Emptied and refilled when
    /// the device answers 401 — the token expires four hours after login and
    /// there is no refresh, only another login.
    token: Arc<Mutex<Option<String>>>,
    /// One socket for every real-time frame, bound on first use. Rebinding per
    /// frame would be a syscall thirty times a second for nothing.
    socket: Arc<OnceCell<UdpSocket>>,
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
            token: Arc::new(Mutex::new(None)),
            socket: Arc::new(OnceCell::new()),
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
            .get(self.url("gestalt"))
            .send()
            .await?
            .text()
            .await?;

        self.parse(&body)
    }

    // ── led control ─────────────────────────────────────────────────────────
    //
    // Everything below is authenticated. All of it is from xled-docs; none of
    // it has been checked against the bench device yet — the first run in
    // Tauri mode is that check.

    /// What the LEDs are doing — `GET /xled/v1/led/mode`.
    pub async fn mode(&self) -> Result<Mode> {
        #[derive(Deserialize)]
        struct Reply {
            mode: Mode,
        }
        let reply: Reply = self.authed("led/mode", None).await?;
        Ok(reply.mode)
    }

    /// Tell the LEDs what to do — `POST /xled/v1/led/mode`.
    pub async fn set_mode(&self, mode: Mode) -> Result<()> {
        self.authed::<CodeOnly>("led/mode", Some(serde_json::json!({ "mode": mode })))
            .await
            .map(drop)
    }

    /// The stored static colour — `GET /xled/v1/led/color`.
    ///
    /// ⚠️ Firmware 2.7.1 or later, per xled-docs. An older device answers this
    /// with an HTTP error, which surfaces as `Unexpected` rather than a colour.
    pub async fn color(&self) -> Result<(u8, u8, u8)> {
        #[derive(Deserialize)]
        struct Reply {
            red: u8,
            green: u8,
            blue: u8,
        }
        let reply: Reply = self.authed("led/color", None).await?;
        Ok((reply.red, reply.green, reply.blue))
    }

    /// Store a static colour — `POST /xled/v1/led/color`.
    ///
    /// Stored, not necessarily shown: the device displays it only in
    /// `Mode::Color`. Same firmware floor as [`Device::color`].
    pub async fn set_color(&self, red: u8, green: u8, blue: u8) -> Result<()> {
        self.authed::<CodeOnly>(
            "led/color",
            Some(serde_json::json!({ "red": red, "green": green, "blue": blue })),
        )
        .await
        .map(drop)
    }

    /// Push one frame in real-time mode — raw UDP to port 7777.
    ///
    /// `frame` is the whole string's LED data: `bytes_per_led` bytes per LED
    /// (`r,g,b` — or `w,r,g,b` on an RGBW profile), in LED order. The caller
    /// must have put the device in [`Mode::Rt`] first, and must keep frames
    /// coming: the device falls back to movie mode after a few quiet seconds,
    /// which is also why an unchanged frame is still worth sending.
    ///
    /// v3 datagrams only (generation II, firmware 2.4.14+) — the same floor
    /// the colour endpoint already sets. Fire and forget: the device never
    /// answers, so a stale token is silence, not an error. The periodic
    /// re-assertion of `Mode::Rt` over HTTP is what heals that, since it
    /// re-logs-in on 401.
    pub async fn realtime_frame(&self, frame: &[u8]) -> Result<()> {
        let token = self.token().await?;
        // The raw 8 bytes, not the base64 the HTTP header carries.
        let token = base64::engine::general_purpose::STANDARD
            .decode(&token)
            .map_err(|error| Error::Unexpected {
                address: self.address,
                detail: format!("the token is not base64: {error}"),
            })?;

        let socket = self
            .socket
            .get_or_try_init(|| UdpSocket::bind("0.0.0.0:0"))
            .await?;

        for datagram in realtime_datagrams(&token, frame) {
            socket
                .send_to(&datagram, (self.address, REALTIME_PORT))
                .await?;
        }
        Ok(())
    }

    // ── the session ─────────────────────────────────────────────────────────

    /// One authenticated exchange: GET when there is no body, POST when there
    /// is, `X-Auth-Token` on either.
    ///
    /// A 401 means the token aged out — there is exactly one fresh login and
    /// one retry, so a device that keeps refusing fails rather than loops.
    async fn authed<T: DeserializeOwned>(
        &self,
        path: &str,
        body: Option<serde_json::Value>,
    ) -> Result<T> {
        let token = self.token().await?;
        let response = self.send(path, body.as_ref(), &token).await?;

        let response = if response.status() == reqwest::StatusCode::UNAUTHORIZED {
            let token = self.fresh_token().await?;
            self.send(path, body.as_ref(), &token).await?
        } else {
            response
        };

        let status = response.status();
        let text = response.text().await?;
        if !status.is_success() {
            // Not `Network`: the device is there and talking, it just refused
            // — an old firmware missing the endpoint answers here, for one.
            return Err(Error::Unexpected {
                address: self.address,
                detail: format!("{path} answered {status} — body was {text:.200}"),
            });
        }

        // Every reply carries an application code beside the payload; anything
        // but 1000 is a refusal wearing a 200.
        let code: CodeOnly = self.parse(&text)?;
        if code.code != CODE_OK {
            return Err(Error::Unexpected {
                address: self.address,
                detail: format!("{path} answered code {} — body was {text:.200}", code.code),
            });
        }

        self.parse(&text)
    }

    fn send(
        &self,
        path: &str,
        body: Option<&serde_json::Value>,
        token: &str,
    ) -> impl std::future::Future<Output = reqwest::Result<reqwest::Response>> {
        let request = match body {
            Some(body) => self.client.post(self.url(path)).json(body),
            None => self.client.get(self.url(path)),
        };
        request.header("X-Auth-Token", token).send()
    }

    /// The held token, or the one a login gets. Concurrent callers queue on
    /// the lock, so a burst of first calls costs one login, not one each.
    async fn token(&self) -> Result<String> {
        let mut slot = self.token.lock().await;
        if let Some(token) = slot.clone() {
            return Ok(token);
        }
        let token = self.login().await?;
        *slot = Some(token.clone());
        Ok(token)
    }

    /// A new login, replacing whatever was held. For the 401 path only.
    async fn fresh_token(&self) -> Result<String> {
        let mut slot = self.token.lock().await;
        let token = self.login().await?;
        *slot = Some(token.clone());
        Ok(token)
    }

    /// The challenge dance — `POST login`, then `POST verify`.
    ///
    /// The challenge is 32 random bytes because the protocol says so; nothing
    /// secret rides on it. The device's `challenge-response` is sent back
    /// verbatim without being checked — verifying it needs the shared key the
    /// community extracted from firmware, and proving the device's identity
    /// buys nothing on a LAN where we just found it by broadcast.
    async fn login(&self) -> Result<String> {
        #[derive(Deserialize)]
        struct LoginReply {
            authentication_token: String,
            #[serde(rename = "challenge-response")]
            challenge_response: String,
            code: i64,
        }

        let mut noise = [0u8; 32];
        getrandom::fill(&mut noise).map_err(|error| {
            // Not a network fault, but the variant fits its consequence: no
            // challenge, no session, nothing sent.
            Error::Network(format!("no randomness for the login challenge: {error}"))
        })?;
        let challenge = base64::engine::general_purpose::STANDARD.encode(noise);

        let text = self
            .client
            .post(self.url("login"))
            .json(&serde_json::json!({ "challenge": challenge }))
            .send()
            .await?
            .text()
            .await?;
        let reply: LoginReply = self.parse(&text)?;
        if reply.code != CODE_OK {
            return Err(Error::Unexpected {
                address: self.address,
                detail: format!("login answered code {} — body was {text:.200}", reply.code),
            });
        }

        // The token is dead until verified — the device answers 401 to
        // everything else in between.
        let text = self
            .client
            .post(self.url("verify"))
            .header("X-Auth-Token", &reply.authentication_token)
            .json(&serde_json::json!({ "challenge-response": reply.challenge_response }))
            .send()
            .await?
            .text()
            .await?;
        let verified: CodeOnly = self.parse(&text)?;
        if verified.code != CODE_OK {
            return Err(Error::Unexpected {
                address: self.address,
                detail: format!(
                    "verify answered code {} — body was {text:.200}",
                    verified.code
                ),
            });
        }

        Ok(reply.authentication_token)
    }

    fn url(&self, path: &str) -> String {
        format!("http://{}/xled/v1/{path}", self.address)
    }

    fn parse<T: DeserializeOwned>(&self, body: &str) -> Result<T> {
        serde_json::from_str(body).map_err(|error| Error::Unexpected {
            address: self.address,
            // The body, not just the parse error: at this point the usual cause
            // is that the address is some other device's web server, and seeing
            // what it actually said is the whole diagnosis.
            detail: format!("{error} — body was {body:.200}"),
        })
    }
}

/// The reply of every command that answers nothing but its code.
#[derive(Deserialize)]
struct CodeOnly {
    code: i64,
}

/// The v3 real-time datagrams for one frame — xled-docs "protocol details".
///
/// Each is `\x03`, the 8 raw token bytes, `\x00\x00`, a fragment number
/// counting from 0, and up to [`REALTIME_FRAGMENT`] bytes of LED data. Pure,
/// so the layout is testable without a socket.
fn realtime_datagrams(token: &[u8], frame: &[u8]) -> Vec<Vec<u8>> {
    frame
        .chunks(REALTIME_FRAGMENT)
        .enumerate()
        .map(|(fragment, chunk)| {
            let mut datagram = Vec::with_capacity(12 + chunk.len());
            datagram.push(0x03);
            datagram.extend_from_slice(token);
            datagram.extend_from_slice(&[0x00, 0x00]);
            datagram.push(fragment as u8);
            datagram.extend_from_slice(chunk);
            datagram
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn modes_travel_lowercase() {
        // The wire form is `{"mode":"color"}` — a capitalised variant name
        // leaking through serde would be refused by the device.
        assert_eq!(serde_json::to_string(&Mode::Color).unwrap(), r#""color""#);
        assert_eq!(
            serde_json::from_str::<Mode>(r#""playlist""#).unwrap(),
            Mode::Playlist
        );
    }

    #[test]
    fn every_mode_but_off_counts_as_lit() {
        assert!(!Mode::Off.is_lit());
        assert!(Mode::Color.is_lit());
        assert!(Mode::Rt.is_lit());
    }

    #[test]
    fn a_small_frame_is_one_v3_datagram() {
        let token = [1, 2, 3, 4, 5, 6, 7, 8];
        let datagrams = realtime_datagrams(&token, &[9, 10, 11]);

        assert_eq!(
            datagrams,
            vec![vec![0x03, 1, 2, 3, 4, 5, 6, 7, 8, 0, 0, 0, 9, 10, 11]]
        );
    }

    #[test]
    fn a_large_frame_fragments_at_900_bytes() {
        // The worked example in xled-docs: 2250 bytes go 900, 900, 450 —
        // fragment numbers 0, 1, 2.
        let token = [0u8; 8];
        let datagrams = realtime_datagrams(&token, &[0xab; 2250]);

        assert_eq!(datagrams.len(), 3);
        assert_eq!(datagrams[0].len(), 12 + 900);
        assert_eq!(datagrams[1].len(), 12 + 900);
        assert_eq!(datagrams[2].len(), 12 + 450);
        assert_eq!(
            datagrams.iter().map(|d| d[11]).collect::<Vec<_>>(),
            vec![0, 1, 2]
        );
    }
}
