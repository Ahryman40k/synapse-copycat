# AGENTS.md — `src-tauri` (Rust backend)

The Rust side of the Tauri app. Read the root `AGENTS.md` first.

This directory is **excluded from ESLint** (`eslint.config.mjs`) and from the Nx
targets. Rust tooling is used directly:

```sh
cd apps/synapse/src-tauri
cargo check
cargo clippy --all-targets
cargo fmt
cargo test
```

Crate name is `app`, library name `app_lib`, edition 2021, MSRV 1.77.2.

---

## Architecture

The design goal: **command handlers know nothing about the platform.** Linux
talks DBus to the OpenRazer daemon, Windows talks REST to a local service, and
everything above the trait boundary is identical.

```
                    frontend (Tauri IPC)
                            │
                            ▼
  commands.rs        run_capability(serial, request) / list_devices()
                            │
                            ▼
  dispatch.rs        dispatch(backend, serial, request)
                            │
  request.rs         CapabilityRequest ──impl From──► Box<dyn Capability>
                            │                        (pure routing table)
                            ▼
  capabilities/*     Capability::execute(backend, serial) -> CapabilityResponse
                            │
                            ▼
  backend/mod.rs     trait DeviceBackend      ← the platform boundary
                       ├── backend/dbus.rs    (cfg linux,   zbus)
                       └── backend/rest.rs    (cfg windows, reqwest)
```

`state.rs` picks the implementation once at startup via `#[cfg(target_os = …)]`
and stores it as `Box<dyn DeviceBackend>` in Tauri managed state. Unsupported
platforms fail loudly at boot rather than silently degrading.

### Why `BoxFuture` everywhere

Both `DeviceBackend` and `Capability` return
`Pin<Box<dyn Future<Output = T> + Send + 'a>>` instead of using native
`async fn`. This is deliberate and documented in `backend/mod.rs`: native
`async fn` in a trait produces an opaque `impl Future`, which makes the trait
**not dyn-compatible** — it could not be stored as `Box<dyn DeviceBackend>`.

Do not "modernise" these signatures to `async fn`. It will not compile against
`state.rs`. In new backend *implementations* you may use
`#[async_trait::async_trait]`, which expands to exactly this shape.

---

## Adding a capability

Six edits, in this order. The first five are Rust, the sixth is TypeScript.

**1. `backend/mod.rs`** — add the method to the `DeviceBackend` trait, in the
matching section (`── dpi ──`, `── lighting.chroma ──`, …):

```rust
fn get_poll_rate(&self, serial: &str) -> BoxFuture<'_, Result<i32, BackendError>>;
```

**2. `backend/dbus.rs`** — declare the DBus method on the right `#[zbus::proxy]`
trait and implement the backend method. OpenRazer uses camelCase method names,
so most need an explicit rename:

```rust
#[zbus(name = "getPollRate")]
fn get_poll_rate(&self) -> zbus::Result<i32>;
```

Interfaces in use: `razer.devices`, `razer.device.misc`, `razer.device.dpi`,
`razer.device.lighting.brightness`, `razer.device.lighting.chroma`, battery.

**3. `backend/rest.rs`** — implement the Windows counterpart. The trait is not
optional: leaving it out breaks the Windows build, which CI does not currently
catch.

**4. `capabilities/<group>.rs`** — a unit struct (no args) or a struct with
public fields (with args), plus the `Capability` impl:

```rust
pub struct GetPollRate;

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

Groups are `misc`, `dpi`, `lighting`, `battery`. Add a new file to
`capabilities/mod.rs` if you need a new group.

**5. `request.rs`** — add the variant to `CapabilityRequest` **and** the arm to
the `From<CapabilityRequest> for Box<dyn Capability>` match. The file comment
says it plainly: *"The only match that needs to grow when you add a new
capability."* Keep it that way — no logic in `request.rs`, only construction.

If the return shape does not fit an existing `CapabilityResponse` variant
(`Ok`, `String`, `Int`, `Float`, `Bool`, `IntPair`, `VidPid`), add one. Both
enums are `#[serde(tag = "type", content = "…")]` — the frontend discriminates
on `type`.

**6. `libs/backend-api`** — mirror the new request/response shape in the
TypeScript `BackendCommands` type, or the frontend cannot call it in a typed way.

---

## Error handling

`BackendError` (`thiserror` + `Serialize`) crosses the IPC boundary as-is, so
frontend code can discriminate on it. Four variants:

| Variant | Use for |
|---|---|
| `InterfaceUnsupported` | the device genuinely lacks this capability |
| `DeviceNotFound` | bad serial |
| `Transport` | DBus/HTTP failure, daemon down |
| `Protocol` | the daemon answered something unexpected |

`From<zbus::Error>` and `From<reqwest::Error>` conversions exist — use `?`
rather than mapping by hand. A device not supporting a capability is **not** a
transport error; map `zbus::Error::InterfaceNotFound` to `InterfaceUnsupported`.

`list_devices` in `commands.rs` deliberately **does not abort** when enriching a
single device fails — it logs and returns the devices that succeeded. Preserve
that behaviour: one flaky peripheral must not blank the dashboard.

---

## Registering a Tauri command

Commands live in `commands.rs`, annotated `#[tauri::command]`, and must be added
to `tauri::generate_handler![]` in `lib.rs`. **Forgetting the registration is a
runtime error, not a compile error** — the frontend `invoke` just rejects.

---

## ⚠️ Known issues

*Snapshot taken 2026-08-11 on branch `09-add-contents`.*

1. **The TS contract and the Rust handlers have diverged.**
   `libs/backend-api` declares commands `devices` and `modules`, and
   `application-store.ts` calls `invoke('devices', {})`. But `lib.rs` registers
   only `run_capability` and `list_devices` — `commands::devices` and
   `commands::modules` are **commented out**. In Tauri mode those calls fail at
   runtime; only the browser/mock path works today. Nothing in the type system
   catches this: `BackendCommands` is hand-written and unverified against Rust.
   Decide the direction (`devices` → `list_devices`, and implement `modules`)
   before building features on top.

2. **`tauri-typegen` is configured but unused.** `tauri.conf.json` declares a
   plugin generating TypeScript into `apps/synapse/src/generated` from
   `libs/backend-api/src/lib/`, and `specta` / `tauri-specta` are dependencies
   with `#[derive(Type)]` already on `Device` and `DeviceKind`. No generated
   output is checked in. Wiring this up would make issue (1) structurally
   impossible — worth doing before hand-writing more of `BackendCommands`.

3. **No tests.** There is not a single `#[cfg(test)]` in this crate. The pure
   functions are the obvious starting point: `DeviceKind::from_type_str`, the
   `From<CapabilityRequest>` routing table, and the `BackendError` conversions —
   none of them need a daemon. `dispatch` can be tested against a fake
   `DeviceBackend`.

4. **`src/__commands.zip`** is committed inside the source tree. It is not
   referenced by anything.

5. **Windows is unverifiable in CI.** CI runs `ubuntu-latest` only, so
   `backend/rest.rs` is never compiled. Assume it is stale.
