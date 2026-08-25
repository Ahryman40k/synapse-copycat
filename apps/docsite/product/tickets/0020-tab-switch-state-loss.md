# 0020 — Per-device control state resets when you switch tabs

**Priority: must land before `0007a`**, per the lead — if still present
when DPI staging ships, five stages vanishing on a tab switch will be
misdiagnosed as a bug in the new staging feature rather than recognised as
this pre-existing mechanism issue.
**Owner:** `frontend`.
**Depends on:** nothing. Self-contained.
**Credit:** found by `frontend` during the control inventory.
**Feature inventory reference:** `features.md` §5, cross-cutting note.

## The problem

Every local `model()` control on a device's Customize/Performance/Power
sections loses its value when you switch to a different tab (e.g. Lighting)
and back. The cause: device pages render their sections through
`ngComponentOutlet`, passing only `device` as input — the section is torn
down and rebuilt on every tab change, and nothing outside the section
persists what it held.

This reads as a bug today, to a user who has no expectation the setting
reaches the mouse at all — set five DPI stages, glance at Lighting, come
back, and the stages are gone. It will get materially worse once wired
controls exist beside not-yet-wired ones on the same page, and it will be
actively misdiagnosed as a defect in `0007a`'s new staging work if not
fixed first.

## Scope

Not "persist every device setting to the backend" — that's the Track B/C
wiring effort itself, control by control. This ticket is specifically about
**where local UI state that hasn't been (or isn't going to be) wired lives
while the dialog is open** — it needs to survive a tab change within the
same device dialog session, independent of whether it eventually round-trips
to hardware.

- Move state that currently lives in a section's own `model()` up to
  something that survives `ngComponentOutlet` swapping the section
  component — a per-device-dialog-session store, or state held by the
  device page itself (which does survive tab switches) and passed down as
  an additional input alongside `device`.
- This should not require every Track B/C ticket to separately solve state
  lifetime — fix the mechanism once, here.

## Acceptance criteria

- [ ] Setting a value on any still-local control (e.g. mouse customize's key bindings, or the sensitivity panel's stage list once `0007a` exists) survives switching to another tab on the same device and back.
- [ ] The fix does not require each future Track B/C ticket to reinvent state persistence — verify by checking that at least two different existing local controls (from different sections) both benefit without per-control special-casing.
- [ ] No regression to controls that already read live from the backend (e.g. `strip-lighting.ts`) — those should keep reading fresh state on open, not accidentally pick up a stale cached value from before a backend write.
- [ ] `nx test synapse` passes.
- [ ] `qa`: on any device page with more than one tab, set a value on one tab, switch to another and back, confirm the value is unchanged. Repeat across at least two device kinds.
