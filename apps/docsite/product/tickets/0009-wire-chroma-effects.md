# 0009 — Wire the Chroma hardware effects (static/spectrum/wave/breathe)

**Track B, capability ticket.**
**Owner:** `frontend` only. **Re-owned per the lead**: `run_capability` already routes and dispatches all five `SetChroma*` capabilities in Rust — the TS `CapabilityRequest` union just never declared them. No new Rust needed; `backend` should not build this.
**Depends on:** `0006-capability-discovery.md` — **done**, ready to build against (confirmed: the Basilisk Ultimate reports _no_ chroma effect capability at all — its colour is per-zone, so "no effect control" is the correct, real answer for this device, not an edge case to special-case away).
**Feature inventory reference:** `features.md` §5 — effects are currently local-state-only across mouse/keyboard/mousemat lighting; `SetChromaStatic`/`SetChromaSpectrum`/`SetChromaWave`/`SetChromaBreath` already implemented and tested in `libs/openrazer`.

## The problem

`application-store.ts::setEffect()`/`setEffectSettings()` only `patchState`
`ApplicationState.lighting`, called from the same three lighting sections as
brightness (0008). `EffectsPanel`'s choice of static/spectrum/wave/breathe
and its per-effect settings (colour, direction) never reach the device.

## Scope — and one thing already decided in the frontend's own model

`core/models/chroma-effect.ts` already documents the mapping precisely and
is worth reading before starting:

- `static` → `SetChromaStatic { r, g, b }`
- `spectrum` → `SetChromaSpectrum`
- `wave` → `SetChromaWave { direction }`
- `breathe` → `SetChromaBreath { r, g, b }`
- `SetChromaNone` is **deliberately not offered** in the UI — the same
  outcome (lighting off) is already the brightness panel's power switch, and
  that comment explains why `SetChromaNone` is the worse of the two paths
  (loses the effect to return to). Don't add a control for it as part of
  this ticket.
- `reactive` is listed as a `ChromaEffect` the mock/UI mentions but has **no
  Rust capability yet** — out of scope for this ticket; if the UI currently
  offers it as a choice, it should be removed or marked unavailable rather
  than silently doing nothing, consistent with the honesty bar the rest of
  this inventory holds the app to (e.g. the Govee switch).

Same sync-across-devices consideration as 0008 applies here (`syncEffect`/`setSyncEffect`).

## Acceptance criteria

- [ ] Choosing an effect and its settings sends the matching `SetChroma*` capability to the device, visible on the fake daemon / real hardware.
- [ ] `reactive`, if currently selectable in the UI, is removed from the choices or shown unavailable — not left silently non-functional.
- [ ] The effects control follows `apps/docsite/design/capability-states.md`'s structural/transient pattern, and is hidden/marked unavailable on a device discovery (0006) reports as not supporting Chroma lighting (e.g. `has_matrix` false and no simple LED either — check against `Canvas::discover`'s existing logic in `painter.rs` for the precedent on how "can this device take an effect at all" is already answered elsewhere in the codebase).
- [ ] **Same Lighting-defers-to-group rule as `0008`** applies here — this is the same tab, and the two capabilities (effect + brightness) should present one consistent disabled/live state for the whole tab, not independently.
- [ ] With "apply to all" (`syncEffect`) on, the same effect+settings reach every capable device.
- [ ] Wire schema follows root `AGENTS.md` §6.
- [ ] `nx test synapse backend-api` pass; `cargo test`/`cargo clippy` clean.
- [ ] `qa`: verify against the fake daemon — set each of the four effects on at least one device and confirm the fake device reports the matching state back; confirm `reactive` (if present) no longer looks like a working choice. **Also verify on the Basilisk Ultimate specifically** (discovery confirms zero chroma effect capability) that no effect control shows at all — the acceptance bar per the lead is more than one device kind, since a capability that renders correctly on the Goliathus and wrongly on the Basilisk would otherwise ship green.
