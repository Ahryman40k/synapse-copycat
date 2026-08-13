---
name: new-tauri-capability
description: Add a new device capability spanning the Rust backend and the TypeScript frontend — DeviceBackend trait method, DBus and REST implementations, Capability struct, CapabilityRequest routing arm, and the matching BackendCommands entry with valibot validation. Use whenever the app needs to read or write something new on a Razer peripheral (poll rate, macro, battery threshold, a new lighting effect), or when adding a Tauri command.
---

# New device capability

A capability crosses two languages and **six files**. The type systems on each
side do not check each other — `BackendCommands` is hand-written and nothing
verifies it against the Rust handlers. That divergence has already happened once
in this repo (see the warning at the end), so follow every step.

Read `apps/synapse/src-tauri/AGENTS.md` for the architecture before starting.

## The pipeline

```
frontend  invoke('run_capability', { serial, request })
             ↓
commands.rs  run_capability()
             ↓
dispatch.rs  dispatch(backend, serial, request)
             ↓
request.rs   CapabilityRequest ──From──► Box<dyn Capability>
             ↓
capabilities/<group>.rs   Capability::execute() → CapabilityResponse
             ↓
backend/mod.rs   trait DeviceBackend
             ├── dbus.rs  (Linux, zbus → OpenRazer daemon)
             └── rest.rs  (Windows, reqwest)
```

Most capabilities go through `run_capability` and need **no new Tauri command**.
Only add one to `commands.rs` + `generate_handler!` in `lib.rs` if you need
something outside the per-device request model (like `list_devices`).

## Steps

Work bottom-up so the code compiles at each stage.

### 1. `backend/mod.rs` — the trait method

Add it under the matching section comment (`── dpi ──`,
`── lighting.chroma ──`, `── battery ──`, `── misc ──`):

```rust
fn get_poll_rate(&self, serial: &str) -> BoxFuture<'_, Result<i32, BackendError>>;
```

Return `BoxFuture`, **not** `async fn`. The trait must stay dyn-compatible
because `state.rs` stores it as `Box<dyn DeviceBackend>`. This is explained in
the file's own comments — do not "modernise" it.

### 2. `backend/dbus.rs` — Linux

Declare the method on the right `#[zbus::proxy]` trait. OpenRazer exposes
camelCase names, so most need an explicit rename:

```rust
#[zbus(name = "getPollRate")]
fn get_poll_rate(&self) -> zbus::Result<i32>;
```

Existing interfaces: `razer.devices`, `razer.device.misc`, `razer.device.dpi`,
`razer.device.lighting.brightness`, `razer.device.lighting.chroma`, battery.
Add a new `#[zbus::proxy]` trait if the capability lives on a new interface.

Then implement the `DeviceBackend` method. Use `?` — `From<zbus::Error>` is
already defined. Map "device does not have this interface" to
`BackendError::InterfaceUnsupported`, never to `Transport`.

### 3. `backend/rest.rs` — Windows

Implement the counterpart. It is not optional: an unimplemented trait method
breaks the Windows build. **CI runs `ubuntu-latest` only and will not catch
it** — check the file compiles by reading it carefully, and say in your report
that Windows was not verified.

### 4. `capabilities/<group>.rs` — the capability struct

Unit struct for no args, fields for args:

```rust
pub struct GetPollRate;
pub struct SetPollRate { pub hz: i32 }

impl Capability for GetPollRate {
	fn execute<'a>(
		self: Box<Self>,
		backend: &'a dyn DeviceBackend,
		serial: &'a str,
	) -> BoxFuture<'a, Result<CapabilityResponse, BackendError>> {
		Box::pin(async move {
			Ok(CapabilityResponse::Int(backend.get_poll_rate(serial).await?))
		})
	}
}
```

Setters return `CapabilityResponse::Ok`. Groups are `misc`, `dpi`, `lighting`,
`battery`; register a new file in `capabilities/mod.rs` if you add a group.

### 5. `request.rs` — the routing table

Two edits, both required:

```rust
pub enum CapabilityRequest {
	// … dpi
	GetPollRate,
	SetPollRate { hz: i32 },
}

impl From<CapabilityRequest> for Box<dyn Capability> {
	fn from(req: CapabilityRequest) -> Self {
		match req {
			// …
			CapabilityRequest::GetPollRate => Box::new(GetPollRate),
			CapabilityRequest::SetPollRate { hz } => Box::new(SetPollRate { hz }),
		}
	}
}
```

The match is exhaustive, so the compiler catches a missing arm. **Keep this file
logic-free** — construction only, as its comment states.

If the return shape fits none of `Ok | String | Int | Float | Bool | IntPair |
VidPid`, add a `CapabilityResponse` variant. Both enums are
`#[serde(tag = "type", content = "…")]`; the frontend discriminates on `type`.

### 6. Frontend — `libs/backend-api`

Mirror the shape in `BackendCommands`
(`libs/backend-api/src/lib/models/backend-commands.ts`), using the **wire**
shape — snake_case, raw numbers — not the app-facing domain type:

```ts
export type BackendCommands = {
	run_capability: {
		args: { serial: string; request: CapabilityRequest };
		options: Record<string, never>;
		returnType: CapabilityResponse;
	};
};
```

`Mock` is derived from `BackendCommands`, so TypeScript will now point at the
mock in `apps/synapse/src/app/app.config.ts` if it is incomplete. Fill it in —
that mock is what keeps the app developable in a browser without a device.

### 7. Validate at runtime — mandatory

The project rule (README §2, root `AGENTS.md` §6): **anything crossing the IPC
boundary is untrusted until parsed.** Add a valibot schema for the response and
parse it where the store maps it into a domain type. Do not `satisfies`-cast a
backend result — that is the existing bug in `application-store.ts`, marked with
two `// TODO: write wrapper here + validator` comments.

## Verify

```sh
cd apps/synapse/src-tauri
cargo check
cargo clippy --all-targets

cd -
pnpm exec nx test synapse backend-api
pnpm exec nx run synapse:tauri     # real backend — needs the OpenRazer daemon
pnpm exec nx serve synapse         # mock path — must still work
```

Both modes must pass. A capability that works in Tauri but breaks the browser
mock is not done.

Worth adding while you are here: the routing table and any `from_*_str` helper
are pure functions and testable without a daemon. This crate has **zero** tests
today.

## ⚠️ Check this first

`libs/backend-api` declares commands `devices` and `modules`, and
`application-store.ts` calls `invoke('devices', {})` — but `lib.rs` registers
only `run_capability` and `list_devices`, with `commands::devices` and
`commands::modules` commented out. **The two sides have already diverged and
only the mock path works.** If your task touches that area, raise it rather than
building on top of it.

`tauri-specta` and `specta` are already dependencies, `#[derive(Type)]` is on
`Device` and `DeviceKind`, and `tauri.conf.json` configures `tauri-typegen` to
emit TypeScript — but no generated output is checked in. Generating the contract
instead of hand-writing it would make this whole class of drift impossible.
Suggest it if you find yourself editing `BackendCommands` by hand again.
