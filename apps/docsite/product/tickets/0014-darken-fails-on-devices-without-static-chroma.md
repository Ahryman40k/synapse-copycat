# 0014 — Darkening a device that has no `SetChromaStatic` silently does nothing

**Priority: P0, in flight.** The lead authorised `backend` to fix this
ahead of DPI/Track B generally. **This is not a new finding — it's half of
a bug the maintainer already reported and believed fixed.** The maintainer
previously reported a device in a disabled group staying lit, with its
on/off state not following the group's; that was fixed for Twinkly strings
(shipped as commit `e58d3ca`). `darken` calling one hardcoded method on
every non-Twinkly participant is the other half of the same bug, still
live, on a device class nobody had tested until capability discovery
existed to surface it.
**Owner:** `backend`, in flight.
**Depends on:** `0006-capability-discovery.md` (done) — this ticket is the fix that consults it where `darken` currently doesn't.
**Credit:** found by `backend` while building capability discovery — their own first daemon-backed test asserted the Basilisk supported the global static colour, and discovery proved it wrong.
**Feature inventory reference:** adds to `features.md` §1 (group engine correctness).

## The problem

`RazerState::darken` (`razer/state.rs`) calls `backend.set_chroma_static(participant, 0, 0, 0)` for **every** non-Twinkly participant unconditionally, as the way to turn a device dark when it joins a stopped group or the app quits. Capability discovery (`0006`) has confirmed the Basilisk Ultimate does not publish `SetChromaStatic` at all (its colour is per-zone). Calling it on that device fails silently (best-effort code, no error surfaced), so **a Basilisk joining a stopped group, or present at quit, stays lit** while every other device in the same group correctly goes dark.

## Why this matters

This is the exact defect class `0012`'s sibling and the quit-fix (already shipped) both exist to close — "a participant's state follows its group's, and a stopped group shows nothing" is a stated invariant (`state.rs`'s own comments), and this is a real, confirmed exception to it, on hardware nobody had tested against until now.

## Acceptance criteria

- [ ] **Must name the Basilisk Ultimate specifically, verified against the fake daemon.** A test on any device that happens to publish `SetChromaStatic` would pass while the bug remains — this is exactly how half the original bug went unnoticed.
- [ ] `darken` consults capability discovery before choosing how to turn a participant dark — a device with no `SetChromaStatic` uses whatever it does support (e.g. `SetChromaNone`, if discovery reports it) rather than one hardcoded call.
- [ ] If a device supports **no** darkening capability at all, this is logged (not silently swallowed) so it's at least diagnosable, even if nothing better can be done today.
- [ ] A daemon-backed test against the Basilisk Ultimate specifically confirms the device is actually darkened, or that the "nothing this device can do" case is explicitly logged rather than silent.
- [ ] `qa`: with the fake daemon, put the Basilisk Ultimate in a group, stop the group or quit the app, and confirm it goes dark like its groupmates — this is directly observable via whatever the fake daemon reports back on a subsequent read.
- [ ] Noted for later: this gets structurally cleaner once the `Surface` protocol abstraction lands (still awaiting the maintainer) — this ticket is the correctness fix now, not a reason to wait for that refactor.

## Expect siblings

`backend` is auditing `darken`'s pattern elsewhere — anywhere else in the
codebase that calls one hardcoded method on every participant regardless of
what it publishes has the same silent-failure shape. Expect a list; each
becomes its own ticket rather than being folded into this one, so each gets
its own device-specific acceptance criterion the way this one does.
