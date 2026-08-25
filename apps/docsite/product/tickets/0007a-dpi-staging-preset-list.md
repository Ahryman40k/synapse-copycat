# 0007a — DPI staging: the preset list, ships now

**Split from `0007`; supersedes it for anything actionable.** See
`0007-wire-dpi.md` for how this was resolved (my initial "delete staged
DPI" recommendation was overridden — deleting user-visible UI is the
maintainer's tier of decision, and the substantive alternative `ux`
designed is better besides).
**Owner:** `frontend` — per the Track B re-scoping, this needs no new Rust: `run_capability` already routes `GetDpi`/`SetDpi`/`GetMaxDpi`, and capability discovery (`0006`) already gates availability.
**Depends on:** `0006` (done); **`0020`** (tab-switch state loss) must land **first** — explicit instruction from the lead, so staging's own state loss is never mistaken for a bug in this new work.
**Design reference:** `apps/docsite/design/dpi-staging.md` (`ux`).
**Feature inventory reference:** `features.md` §5.

## What this is

DPI stages do not exist on OpenRazer's wire at all — confirmed independently
by the lead's daemon probe and by `backend` reading `dpi.rs`: `razer.device.dpi`
publishes only `getDPI`/`setDPI`/`maxDPI`. But the concept was never meant to
live on the device: `core/models/key-binding.ts` already declares
`SensitivityAction = 'stage-up' | 'stage-down' | 'cycle' | 'clutch'`, which
only makes sense if the _application_ holds the stage list and an index
into it. The sensitivity panel and the assignment editor were designed as
two halves of one feature, never connected to each other or to anything
real. This ticket finishes the half that needs no button-input feasibility
answer: a clickable stage list, applied one value at a time via plain `setDPI`.

## Acceptance criteria

- [ ] The stage list is real application state with a durable home — `wallpapers-store.ts` is the named precedent (a root-provided, per-feature store via a factory), not a component-local `model()` that resets on navigation.
- [ ] Clicking a stage applies it to the device via `setDPI`; the panel reflects the device's actual current DPI on open.
- [ ] Staging is gated by the **same** capability check as plain DPI — nothing on the wire distinguishes "supports staging," so no second gate is invented.
- [ ] **Honest UI, per `ux`'s treatment**: nothing here implies a mouse button can cycle stages — that's `0007b`, separately blocked. A stage list that looks like full Synapse parity while quietly missing the button-binding half repeats the exact failure this whole effort exists to fix.
- [ ] `0020` (tab-switch state loss) is confirmed landed before this ships.
- [ ] Wire schema follows root `AGENTS.md` §6.
- [ ] `nx test synapse backend-api` pass; `cargo test`/`cargo clippy` clean (no Rust change expected, but confirm nothing regressed).
- [ ] `qa`: verify against the fake daemon — clicking each stage changes what a subsequent `GetDpi` reports; the stage list survives closing and reopening the device dialog, and surviving a tab switch within the dialog (regression check tied to `0020`).
