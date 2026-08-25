# 0021 — Wire wireless power saving (mouse → power)

**Track B, capability ticket — moved from "needs new Rust" to "already exists," per `backend`'s re-check.**
**Owner:** `backend` (Rust) + `frontend` (UI + contract).
**Depends on:** `0006-capability-discovery.md` — done.
**Feature inventory reference:** `features.md` §5, "Mouse → Power (sleep timer, low-power threshold)." `backend` confirmed `razer.device.power` exposes `getIdleTime`/`setIdleTime` and `getLowBatteryThreshold`/`setLowBatteryThreshold` on the Basilisk — a near-exact match for the two controls already on this page.

## The problem

`mouse-power.ts` → `wireless-power-saving-panel.ts` (sleep-after) and
`low-power-mode-panel.ts` (low-power threshold) are both local `model()`s
today, same shape of defect as the rest of Track B/C.

## Scope

- `getIdleTime`/`setIdleTime` → the sleep-after control.
- `getLowBatteryThreshold`/`setLowBatteryThreshold` → the low-power threshold control.
- Both are wireless-only settings shown unconditionally today with "no
  `wireless` flag exists to gate them," per the source comment
  (`mouse-power.ts`). Capability discovery is the natural fix for this too
  — a wired mouse simply won't report these capabilities, which is a
  cleaner signal than trying to detect "wireless" as its own property.

## Acceptance criteria

- [ ] Both controls read the device's actual current values on open and write changes back via `SetIdleTime`/`SetLowBatteryThreshold`.
- [ ] A wired mouse (or any device discovery reports as lacking these capabilities) shows neither control — replacing the current "shown unconditionally" behaviour, and confirming discovery is a sufficient replacement for the missing `wireless` flag the source comment flagged as absent.
- [ ] Wire schema follows root `AGENTS.md` §6.
- [ ] `nx test synapse backend-api` pass; `cargo test`/`cargo clippy` clean.
- [ ] `qa`: verify against the fake daemon's Basilisk fixture (or whichever wireless fixture exists) — confirm both settings round-trip, and confirm a wired-only fixture shows neither control.
