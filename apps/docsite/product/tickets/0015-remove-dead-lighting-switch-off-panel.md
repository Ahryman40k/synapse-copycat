# 0015 — The lighting-switch-off panel: awaiting maintainer decision

**Status: awaiting maintainer decision — not ready to build.** Corrected
from an earlier version of this ticket that treated removal as settled.
**Decision owner:** the maintainer, not `po`, not `frontend`. Per the lead:
"Deleting user-visible UI is the maintainer's call" — the same tier of
decision as "hide the five inert pages vs. wire them for real," which the
maintainer already chose to answer by building rather than hiding. `po`
and `ux` both independently recommend removal below; **neither
recommendation is a decision.**
**Depends on:** the maintainer's answer.
**Feature inventory reference:** `features.md` §5.

## The problem

`lighting-switch-off-panel` ("switch off lighting when display is turned
off," present on all three lighting sections) is not merely unwired to the
backend like the rest of Track B's inert controls — it's not wired to
**anything**. `frontend`'s exact words: "the component class is empty —
`export class LightingSwitchOffPanelComponent {}` — and the checkbox has no
binding at all. Clicking it does nothing whatsoever, not even in memory."

This is a different, worse category than the rest of the inert controls
covered by Track B: those at least remember the choice in
`ApplicationStore`. This one doesn't even do that.

## Two options for the maintainer

**A. Remove it.** No OpenRazer capability exists anywhere in
`libs/openrazer` for "switch off lighting when the display sleeps," and
nothing in this round's scope adds one. `po` and `ux` (independently,
reading `frontend`'s inventory) both recommend this — a checkbox with zero
effect, not even a remembered preference, fails the honesty bar applied
elsewhere this round (Govee, the Modules tile).

**B. Build the backing.** Given the maintainer's answer on the five device
pages generally (wire for real, don't hide), it's plausible the same
answer applies here: research whether OpenRazer or the underlying platform
(e.g. a DPMS/screen-lock signal on the Linux side, independent of the
Razer daemon) can drive this, and build it as a genuine feature rather than
removing the promise. This would be a materially bigger ticket than "wire
an existing capability" — there may be no Razer-side capability to wire at
all, only a platform-level integration to design.

## What `po` needs from the maintainer

A choice between A and B (or confirmation that A is fine, given it's a much
smaller and more clearly-scoped removal than the other four inert-page
questions already decided). Until then, `frontend` should not touch this
component.

## Acceptance criteria (if A is chosen)

- [ ] `LightingSwitchOffPanelComponent` and its usages in the three lighting sections are removed.
- [ ] `nx test synapse` passes with it removed.
- [ ] `qa`: confirm the three lighting sections (mouse, keyboard, mousemat) no longer show the control, and no visible layout regression.

## Acceptance criteria (if B is chosen)

- [ ] To be scoped once the maintainer confirms B and `backend` researches what, if anything, can back it — likely a new ticket rather than an amendment to this one, given the scope difference.
