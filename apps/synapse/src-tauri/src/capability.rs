//! One `run_capability`, across every protocol the application speaks.
//!
//! The openrazer crate owns the Razer capabilities and knows nothing about
//! Twinkly; the twinkly crate is a protocol library and knows nothing about
//! capabilities. This is the adapter between them: one request type the
//! frontend can send for any participant, routed here to whichever protocol
//! the participant belongs to — the same one-place-not-a-branch-per-command
//! argument as `discovery`.

use std::collections::HashMap;
use std::net::Ipv4Addr;

use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;

use openrazer::{
    backend::BackendError,
    request::{CapabilityRequest as RazerCapabilityRequest, CapabilityResponse},
};

use crate::razer::engine::frame::Rgb;
use crate::razer::engine::group::ParticipantId;

// ─── The request, over every protocol ────────────────────────────────────────

/// What `run_capability` accepts. The frontend still sends one flat
/// `{ "type": …, "args": … }` object; which protocol answers is decided by the
/// discriminator, not by the caller.
///
/// ⚠️ Untagged, so serde tries Razer first and Twinkly second — which makes a
/// typo in `type` come back as "did not match any variant" rather than naming
/// the unknown string. The tests below are what keep the two sets disjoint.
#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum AnyCapabilityRequest {
    Razer(RazerCapabilityRequest),
    Twinkly(TwinklyCapabilityRequest),
}

/// The Twinkly capabilities. Prefixed variant names, so the wire discriminator
/// can never collide with a Razer capability — the untagged union above has
/// nothing else to route on, which is why the prefix clippy dislikes is load-
/// bearing rather than noise.
#[allow(clippy::enum_variant_names)]
#[derive(Debug, Deserialize)]
#[serde(tag = "type", content = "args")]
pub enum TwinklyCapabilityRequest {
    /// On means `Mode::Color` — the strip lights up with its stored static
    /// colour, the one thing this application can also show and edit. Off is
    /// `Mode::Off`. A movie the vendor app uploaded is deliberately not
    /// restored: the switch must never turn on something this UI cannot see.
    TwinklySetPower { on: bool },
    /// Stores the colour, and switches a lit device to `Mode::Color` so the
    /// change is visible — stored-but-hidden reads as a silent failure.
    TwinklySetColor { color: Rgb },
    /// What the strip is doing right now, so a panel opens telling the truth
    /// rather than assuming its own last write.
    TwinklyGetLighting,
}

// ─── The response ─────────────────────────────────────────────────────────────

/// What `run_capability` answers. Untagged: each side keeps its own
/// `{ "type": …, "value": … }` shape and the frontend discriminates on `type`
/// exactly as before.
#[derive(Debug, Serialize)]
#[serde(untagged)]
pub enum AnyCapabilityResponse {
    Razer(CapabilityResponse),
    Twinkly(TwinklyCapabilityResponse),
}

impl AnyCapabilityResponse {
    /// The shared "done, nothing to say" — Razer's `Ok`, so the frontend has
    /// one success shape rather than one per protocol.
    fn ok() -> Self {
        Self::Razer(CapabilityResponse::Ok)
    }
}

#[derive(Debug, Serialize)]
#[serde(tag = "type", content = "value")]
pub enum TwinklyCapabilityResponse {
    Lighting(StripLighting),
}

/// `color` crosses the IPC as `#rrggbb` — `Rgb`'s serde form, the one the
/// colour picker produces and valibot's `hexColor()` validates.
#[derive(Debug, Serialize)]
pub struct StripLighting {
    pub on: bool,
    pub color: Rgb,
}

/// What a Twinkly can be asked for, as the `type` names `run_capability` takes.
///
/// A constant, unlike the Razer side: the light string protocol is the same on
/// every device that speaks it, so there is nothing to introspect. What does
/// vary is firmware — `TwinklyGetLighting` needs 2.7.1 for the colour endpoint
/// — and that cannot be known without asking, so it is reported as available
/// and fails honestly on an older string rather than being hidden from a
/// device that probably has it.
pub const TWINKLY_CATALOGUE: &[&str] =
    &["TwinklySetPower", "TwinklySetColor", "TwinklyGetLighting"];

// ─── The pool ─────────────────────────────────────────────────────────────────

/// Every Twinkly a sweep has seen, by participant.
///
/// Tauri managed state, filled by `discovery` as it describes devices. A
/// participant is opaque to everyone else, so this map is the only place that
/// can turn one back into an address — and a handle is kept rather than
/// rebuilt so its session survives between commands: each `twinkly::Device`
/// carries the login token, and a fresh one per command would log in every
/// time.
#[derive(Default)]
pub struct TwinklyPool {
    devices: Mutex<HashMap<ParticipantId, twinkly::Device>>,
}

impl TwinklyPool {
    /// Called by every sweep, for every device it saw.
    pub async fn remember(&self, participant: ParticipantId, address: Ipv4Addr) {
        let mut devices = self.devices.lock().await;
        match devices.get(&participant) {
            // Same address: keep the handle, and with it the session.
            Some(known) if known.address() == address => {}
            _ => {
                devices.insert(participant, twinkly::Device::new(address));
            }
        }
    }

    /// Run one Twinkly capability.
    pub async fn execute(
        &self,
        participant: &str,
        request: TwinklyCapabilityRequest,
    ) -> Result<AnyCapabilityResponse, BackendError> {
        let device = self.device(participant).await?;

        match request {
            TwinklyCapabilityRequest::TwinklySetPower { on } => {
                let mode = if on {
                    twinkly::Mode::Color
                } else {
                    twinkly::Mode::Off
                };
                device.set_mode(mode).await.map_err(convert)?;
                Ok(AnyCapabilityResponse::ok())
            }

            TwinklyCapabilityRequest::TwinklySetColor { color } => {
                device
                    .set_color(color.r, color.g, color.b)
                    .await
                    .map_err(convert)?;
                // A device that is lit but showing something else — a movie,
                // the demo — has taken the colour without showing it. Switch
                // it to the one mode where the choice is visible. A dark
                // device stays dark: colour and power are two controls.
                if device.mode().await.map_err(convert)?.is_lit() {
                    device
                        .set_mode(twinkly::Mode::Color)
                        .await
                        .map_err(convert)?;
                }
                Ok(AnyCapabilityResponse::ok())
            }

            TwinklyCapabilityRequest::TwinklyGetLighting => {
                let mode = device.mode().await.map_err(convert)?;
                // ⚠️ Needs firmware 2.7.1 for the colour endpoint. An older
                // device fails the whole read rather than answering half —
                // the panel then shows its error instead of an invented colour.
                let (r, g, b) = device.color().await.map_err(convert)?;
                Ok(AnyCapabilityResponse::Twinkly(
                    TwinklyCapabilityResponse::Lighting(StripLighting {
                        on: mode.is_lit(),
                        color: Rgb::new(r, g, b),
                    }),
                ))
            }
        }
    }

    /// The handle for one participant — for this module and for the engine's
    /// runner, which drives the strip the same session everything else uses.
    pub(crate) async fn device(&self, participant: &str) -> Result<twinkly::Device, BackendError> {
        self.devices
            .lock()
            .await
            .get(participant)
            .cloned()
            .ok_or_else(|| {
                // The strip's tile only exists because a sweep answered, so an
                // unknown participant here means the pool was emptied by a
                // restart — the next sweep repopulates it.
                BackendError::DeviceNotFound(format!("{participant} — no sweep has seen it yet"))
            })
    }
}

/// The twinkly crate's faults, in the vocabulary the frontend already reads.
pub(crate) fn convert(error: twinkly::Error) -> BackendError {
    match error {
        twinkly::Error::Network(detail) => BackendError::Transport(detail),
        unexpected @ twinkly::Error::Unexpected { .. } => {
            BackendError::Protocol(unexpected.to_string())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_razer_request_routes_to_razer() {
        let request: AnyCapabilityRequest =
            serde_json::from_str(r#"{ "type": "GetDpi" }"#).unwrap();
        assert!(matches!(request, AnyCapabilityRequest::Razer(_)));
    }

    #[test]
    fn a_twinkly_request_routes_to_twinkly() {
        let request: AnyCapabilityRequest = serde_json::from_str(
            r##"{ "type": "TwinklySetColor", "args": { "color": "#48c242" } }"##,
        )
        .unwrap();
        let AnyCapabilityRequest::Twinkly(TwinklyCapabilityRequest::TwinklySetColor { color }) =
            request
        else {
            panic!("routed to the wrong protocol");
        };
        assert_eq!(color, Rgb::new(0x48, 0xc2, 0x42));
    }

    #[test]
    fn a_lighting_answer_keeps_the_tagged_shape() {
        // What the frontend discriminates on — `type`, then `value`, with the
        // colour in the `#rrggbb` form valibot expects.
        let answer =
            AnyCapabilityResponse::Twinkly(TwinklyCapabilityResponse::Lighting(StripLighting {
                on: true,
                color: Rgb::new(255, 0, 0),
            }));
        assert_eq!(
            serde_json::to_string(&answer).unwrap(),
            r##"{"type":"Lighting","value":{"on":true,"color":"#ff0000"}}"##
        );
    }

    #[test]
    fn a_success_answer_is_razers_ok() {
        assert_eq!(
            serde_json::to_string(&AnyCapabilityResponse::ok()).unwrap(),
            r#"{"type":"Ok"}"#
        );
    }
}
