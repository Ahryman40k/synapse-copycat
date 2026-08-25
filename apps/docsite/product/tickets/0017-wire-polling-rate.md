# 0017 — Wire polling rate (mouse → performance)

**Track B, capability ticket — confirmed cheap, ready to build.**
**Owner:** `backend` (Rust) + `frontend` (UI + contract).
**Depends on:** `0006-capability-discovery.md` — done. `backend` confirmed `getPollRate`/`setPollRate` on `razer.device.misc`, present on the Basilisk and **absent** on the Huntsman despite both exposing the same interface — the textbook proof that discovery-driven rendering works, and `backend` suggested doing this one early for exactly that reason.
**Feature inventory reference:** `features.md` §5, "Mouse → Performance"; `backend` flagged this specific capability as already present on `razer.device.misc`, pulling it from the "expensive" half of Track B into the "cheap" half.

## The problem

`mouse-performance.ts` → `polling-rate-panel.ts`'s `model<PollingRate>()`
(125/500/1000 Hz choices) is never read past the component, same shape of
defect as `0007`'s DPI panel.

## Scope

- New `CapabilityRequest` variants (`GetPollRate`, `SetPollRate { hz }`) per the `new-tauri-capability` skill's six-file flow — this needs new `Capability` structs and routing-table entries even though the underlying `DeviceBackend` trait method may already exist in some form; check `backend/mod.rs` for what's actually there today before assuming a full six-file add is needed.
- `polling-rate-panel.ts` reads the device's actual rate on open and writes a change back.
- On a mouse discovery reports as lacking this specific method (the real example above), the control follows `capability-states.md`'s structural-absence pattern — omitted, not disabled.

## Acceptance criteria

- [ ] Setting polling rate in the UI changes what the fake daemon reports back on a subsequent read.
- [ ] A mouse discovery reports as not supporting `SetPollRate` doesn't show the control at all (test against the real two-mice discrepancy `backend` already found).
- [ ] Wire schema follows root `AGENTS.md` §6.
- [ ] `nx test synapse backend-api` pass; `cargo test`/`cargo clippy` clean.
- [ ] `qa`: verify against the fake daemon on both of the two mice discovery already distinguishes — confirm the control appears on one and not the other, and that setting it on the one that has it actually changes the reported rate.
