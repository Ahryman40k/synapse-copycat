# 0007b — DPI staging: button-bound cycling

**Status: blocked on a feasibility answer, not merely unscheduled.** Do not
treat as ordinary backlog — see below.
**Owner:** `backend` to answer feasibility first; real owner TBD once that lands.
**Depends on:** `0007a` shipping (the stage list this would cycle through).
**Feature inventory reference:** `features.md` §5.

## What this is

Binding a physical mouse button to `stage-up`/`stage-down`/`cycle`/`clutch`
(`core/models/key-binding.ts`'s `SensitivityAction`) — the actual point of
DPI staging for the competitive-player use case, and the half of Windows
Synapse parity `0007a` alone does not deliver.

## The blocking question, put to `backend`, timeboxed

**Can a physical button press on a Razer device reach this application at
all?** The lead's expectation, stated for the record rather than as an
answer: OpenRazer likely handles button input inside the daemon/driver
without publishing input events to userspace clients — in which case
`cycle`/`clutch`/button-bound staging are not "later," they are
**unreachable by this architecture**, full stop, and this ticket closes as
infeasible rather than waiting for prioritisation.

## What happens depending on the answer

- **If feasible**: this becomes a real ticket, scoped like the rest of
  Track B once the actual mechanism (an event stream? a callback
  registration?) is known.
- **If infeasible**: `0007a`'s UI must say so explicitly rather than
  leaving a silent gap — `ux` should be looped back in for the wording,
  matching the honesty bar applied to Govee and the rest of this round's
  "can't do it, say so" pattern.

## Acceptance criteria

- [ ] `backend` has answered the feasibility question above, with evidence (not a guess) — either a mechanism found, or a documented reason none exists on this daemon/driver stack.
- [ ] `po` and `ux` are notified of the answer before `0007a` ships, so the UI's honesty about what it does and doesn't do is accurate at launch, not patched in after.
