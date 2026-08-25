//! An MCP server, so something other than the window can drive the lighting.
//!
//! **Inside the application, not beside it.** The engine, the groups and the
//! open devices live in this process; a server outside it would have nothing to
//! talk to. So the tools here reach the same `RazerState` the window does, and
//! a change made through either is immediately true for both.
//!
//! ⚠️ **Bound to loopback.** Anything that can reach this can set the lighting,
//! and `127.0.0.1` puts that at the same trust boundary as the application
//! itself: a process already on this machine. Exposing it to a network — which
//! is what a hosted assistant would need — is a different decision, with
//! authentication attached, and is deliberately not taken here.
//!
//! The tools are the application's own commands, not a second vocabulary.
//! Anything an assistant can do here, the window can do too, and the other way
//! round.

use rmcp::handler::server::wrapper::Parameters;
use rmcp::model::{CallToolResult, ContentBlock, ServerCapabilities, ServerInfo};
use rmcp::transport::streamable_http_server::{
    session::local::LocalSessionManager, StreamableHttpService,
};
use rmcp::{tool, tool_handler, tool_router, ErrorData, ServerHandler};
use serde::Deserialize;
use tauri::Manager;

use crate::razer::engine::ambience::Ambience;
use crate::razer::engine::frame::Rgb;
use crate::razer::engine::group::GroupId;
use crate::razer::state::RazerState;

/// Where the server listens.
///
/// Fixed rather than negotiated: a client's configuration has to name it, and a
/// port that moves between runs is one nobody can write down.
pub const ADDRESS: &str = "127.0.0.1:8730";

/// ⚠️ Holds the `AppHandle` rather than the state, and fetches the state per
/// call. Tauri owns the one `RazerState` and hands it out by borrow; keeping a
/// borrow here would need a lifetime the server cannot have. The handle is
/// `'static` and cheap to clone, which is the same shape `watch` uses.
///
/// ⚠️ No `tool_router` field, unlike most examples: in rmcp 2.2 the handler
/// calls `Self::tool_router()` statically, so a field holding one is built,
/// never read, and quietly suggests the tools are registered from it.
#[derive(Clone)]
pub struct Synapse {
    app: tauri::AppHandle,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct GroupRef {
    /// The group's id, as `list_groups` reports it.
    pub id: GroupId,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct NewGroup {
    /// What to call it. Shown to whoever opens the window.
    pub name: String,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct GroupColour {
    pub id: GroupId,
    /// `#rrggbb`.
    pub colour: String,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct GroupMembers {
    pub id: GroupId,
    /// Participant identifiers, as `list_participants` reports them.
    pub members: Vec<String>,
}

#[tool_router]
impl Synapse {
    pub fn new(app: tauri::AppHandle) -> Self {
        Self { app }
    }

    fn state(&self) -> tauri::State<'_, RazerState> {
        self.app.state::<RazerState>()
    }

    #[tool(
        description = "Every group, what it is showing, who is in it, and what each participant is achieving."
    )]
    async fn list_groups(&self) -> Result<CallToolResult, ErrorData> {
        json(&self.state().groups().await)
    }

    #[tool(
        description = "Participants no group has claimed. These are the identifiers set_group_members takes."
    )]
    async fn list_unassigned(&self) -> Result<CallToolResult, ErrorData> {
        match self.state().unassigned().await {
            Ok(participants) => json(&participants),
            Err(error) => Err(failed(error)),
        }
    }

    #[tool(description = "Make a group. It arrives empty and stopped.")]
    async fn create_group(
        &self,
        Parameters(NewGroup { name }): Parameters<NewGroup>,
    ) -> Result<CallToolResult, ErrorData> {
        // ⚠️ The same call the window makes. It used to be a second version of
        // `create` written here, taking a name and hard-coding green while the
        // window took a name, members and an ambience — two vocabularies for
        // one operation, a fortnight apart at most.
        match self
            .state()
            .create_group(name, Vec::new(), Ambience::still(GREEN))
            .await
        {
            Ok(id) => json(&id),
            Err(error) => Err(failed(error)),
        }
    }

    #[tool(description = "Remove a group. Its participants go back to waiting for one.")]
    async fn remove_group(
        &self,
        Parameters(GroupRef { id }): Parameters<GroupRef>,
    ) -> Result<CallToolResult, ErrorData> {
        match self.state().remove_group(id).await {
            Ok(()) => json(&"removed"),
            Err(error) => Err(failed(error)),
        }
    }

    #[tool(
        description = "Put a set of participants in a group, replacing whoever was in it. A participant belongs to at most one group, so this takes them from wherever they were."
    )]
    async fn set_group_members(
        &self,
        Parameters(GroupMembers { id, members }): Parameters<GroupMembers>,
    ) -> Result<CallToolResult, ErrorData> {
        match self.state().set_group_members(id, members).await {
            Ok(()) => json(&"set"),
            Err(error) => Err(failed(error)),
        }
    }

    #[tool(description = "Show one colour on a group, with no movement. Takes #rrggbb.")]
    async fn set_group_colour(
        &self,
        Parameters(GroupColour { id, colour }): Parameters<GroupColour>,
    ) -> Result<CallToolResult, ErrorData> {
        let rgb = parse_hex(&colour).ok_or_else(|| {
            ErrorData::invalid_params(format!("{colour} is not a #rrggbb colour"), None)
        })?;

        match self
            .state()
            .set_group_ambience(id, Ambience::still(rgb))
            .await
        {
            Ok(()) => json(&"set"),
            Err(error) => Err(failed(error)),
        }
    }

    #[tool(description = "Start a group drawing.")]
    async fn start_group(
        &self,
        Parameters(GroupRef { id }): Parameters<GroupRef>,
    ) -> Result<CallToolResult, ErrorData> {
        match self.state().start_group(id).await {
            Ok(()) => json(&"started"),
            Err(error) => Err(failed(error)),
        }
    }

    #[tool(description = "Stop a group. Its devices go dark.")]
    async fn stop_group(
        &self,
        Parameters(GroupRef { id }): Parameters<GroupRef>,
    ) -> Result<CallToolResult, ErrorData> {
        self.state().stop_group(id).await;
        json(&"stopped")
    }
}

/// Razer green, the same default the window starts a group with.
const GREEN: Rgb = Rgb::new(0, 255, 0);

#[tool_handler]
impl ServerHandler for Synapse {
    fn get_info(&self) -> ServerInfo {
        let mut info = ServerInfo::default();
        info.instructions = Some(
            "Lighting for Razer peripherals and Twinkly light strings. A group holds \
             participants and one ambience across them; a participant belongs to at most \
             one group. Start from list_groups."
                .into(),
        );
        info.capabilities = ServerCapabilities::builder().enable_tools().build();
        info
    }
}

fn json<T: serde::Serialize>(value: &T) -> Result<CallToolResult, ErrorData> {
    let text = serde_json::to_string_pretty(value)
        .map_err(|error| ErrorData::internal_error(error.to_string(), None))?;
    Ok(CallToolResult::success(vec![ContentBlock::text(text)]))
}

fn failed(error: impl std::fmt::Display) -> ErrorData {
    ErrorData::internal_error(error.to_string(), None)
}

/// `#rrggbb`, and nothing else. The same form the rest of the application uses.
fn parse_hex(colour: &str) -> Option<Rgb> {
    let hex = colour.strip_prefix('#')?;
    if hex.len() != 6 {
        return None;
    }
    Some(Rgb::new(
        u8::from_str_radix(&hex[0..2], 16).ok()?,
        u8::from_str_radix(&hex[2..4], 16).ok()?,
        u8::from_str_radix(&hex[4..6], 16).ok()?,
    ))
}

/// Serve until the process ends.
pub fn spawn(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        let service = StreamableHttpService::new(
            move || Ok(Synapse::new(app.clone())),
            LocalSessionManager::default().into(),
            Default::default(),
        );

        let router = axum::Router::new().nest_service("/mcp", service);
        let listener = match tokio::net::TcpListener::bind(ADDRESS).await {
            Ok(listener) => listener,
            // Not fatal: the window is the application, and a port already
            // taken is a second instance or something else on 8730 — worth
            // saying once, not worth refusing to start over.
            Err(error) => {
                eprintln!("warn: no MCP server on {ADDRESS} — {error}");
                return;
            }
        };

        println!("MCP server on http://{ADDRESS}/mcp");
        if let Err(error) = axum::serve(listener, router).await {
            eprintln!("warn: the MCP server stopped — {error}");
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Every tool is registered, with a description an assistant can read.
    ///
    /// ⚠️ Worth asserting rather than assuming: the tools reach the router
    /// through a macro, and a server that exposes none looks exactly like one
    /// that is working until something tries to call it.
    #[test]
    fn every_tool_is_registered_and_described() {
        let tools = Synapse::tool_router().list_all();
        let names: Vec<&str> = tools.iter().map(|tool| tool.name.as_ref()).collect();

        for expected in [
            "list_groups",
            "list_unassigned",
            "create_group",
            "remove_group",
            "set_group_members",
            "set_group_colour",
            "start_group",
            "stop_group",
        ] {
            assert!(
                names.contains(&expected),
                "{expected} is missing: {names:?}"
            );
        }

        for tool in &tools {
            assert!(
                tool.description
                    .as_ref()
                    .is_some_and(|text| !text.is_empty()),
                "{} has nothing to tell a caller",
                tool.name
            );
        }
    }

    #[test]
    fn reads_the_colour_form_the_rest_of_the_application_uses() {
        assert_eq!(parse_hex("#ff8000"), Some(Rgb::new(255, 128, 0)));
        // Anything else is refused rather than guessed at: an assistant that
        // says "red" should be told the shape, not silently given black.
        assert_eq!(parse_hex("ff8000"), None);
        assert_eq!(parse_hex("#fff"), None);
        assert_eq!(parse_hex("#gggggg"), None);
    }
}
