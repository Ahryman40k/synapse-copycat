# 0008 — Wire brightness end to end (mouse/keyboard/mousemat lighting)

**Track B, capability ticket.**
**Owner:** `frontend` only. **Re-owned per the lead**: `run_capability` already routes and dispatches `GetBrightness`/`SetBrightness` in Rust — the TS `CapabilityRequest` union just never declared them. No new Rust needed; `backend` should not build this.
**Depends on:** `0006-capability-discovery.md` — **done**, ready to build against (confirmed: at least one real device, the Kraken, reports no brightness capability at all — this is a real case to test, not a hypothetical).
**Feature inventory reference:** `features.md` §5 — brightness is currently local-state-only across all three lighting sections; `GetBrightness`/`SetBrightness` already implemented and tested in `libs/openrazer`.

## The problem

`application-store.ts::setBrightness()` only `patchState`s
`ApplicationState.lighting`. It's called from `mouse-lighting.ts`,
`keyboard-lighting.ts` and `mousemat-lighting.ts` alike — all three share the
same store method — but nothing there calls `run_capability`. A brightness
slider visibly moves and nothing on the device changes.

## What makes this one slightly different from a single-page capability

Brightness already has a **sync-across-devices** feature built and working
at the state layer: `syncBrightness` (a boolean in `ApplicationState`) and
`setSyncBrightness()` cause one brightness change to apply to every device's
`lighting` entry at once. This ticket needs to preserve that behaviour while
making the actual write real — i.e. turning the sync on should not just
patch every device's state, it should **send a capability write to every
affected device**, and the store already has the list of targets computed
(`store.devices().map((device) => device.id)` inside `setBrightness`).

## Acceptance criteria

- [ ] Changing brightness on a device's lighting panel sends `SetBrightness { value }` to that device via `run_capability`, and the change is visible on the fake daemon / real hardware.
- [ ] Opening a lighting panel reads the device's actual current brightness via `GetBrightness` rather than assuming a stored/default value (mirrors the pattern `strip-lighting.ts` already uses for Twinkly — read on open, write on change).
- [ ] With "apply to all" (`syncBrightness`) on, a change reaches every device discovery (0006) says supports brightness — not devices that don't (e.g. a device with no lighting at all).
- [ ] The brightness control follows `apps/docsite/design/capability-states.md`'s structural/transient pattern (omit vs. disabled-with-reason) — same as `0007`.
- [ ] **The Lighting tab defers to the device's group, per `capability-states.md` §4**: a device that belongs to a group — running _or stopped_ — shows its Lighting tab disabled, with a reason naming the group and a link/button to open that group's ambience card, rather than a live brightness control that a group restart would silently overwrite. Only a device in the unassigned tray (no group at all) gets a fully live Lighting tab. Stopped counts as "in a group" for this rule — the design doc explains why (a stopped group repaints without warning when started again).
- [ ] Wire schema follows root `AGENTS.md` §6 — parsed with valibot, not cast.
- [ ] `nx test synapse backend-api` pass; `cargo test`/`cargo clippy` clean.
- [ ] `qa`: verify against the fake daemon on **both** a device that supports brightness (e.g. a mouse or keyboard) **and the Kraken specifically, which discovery confirms does not** — the acceptance bar per the lead is verification against more than one device kind, because a capability that works on one and silently mis-renders on another (discovery says missing, but the control still shows, or vice versa) would otherwise ship green. Confirm a brightness change is both visible in the UI and reflected in a subsequent read from the fake device, and confirm "apply to all" actually writes to all affected devices, not just the one being edited, and correctly skips the Kraken.
