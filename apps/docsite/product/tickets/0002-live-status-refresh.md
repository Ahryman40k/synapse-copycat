# 0002 — Live per-device status figures never refresh without a reload

**Owner:** `frontend` (UI) + `backend` (needs to weigh in on push-vs-poll before frontend starts — see Dependencies)
**Depends on:** a design decision from `backend` on how the frontend learns of a new measurement (see below). Message `backend` before starting the frontend half.
**Feature inventory reference:** `apps/docsite/product/features.md` §1, last row.

## The problem

A running group reports, per participant, whether it's painting a full
picture or an approximated colour, and the **achieved** frame rate — which
can be lower than the requested cadence when a device can't keep up
(`effectiveHertz`/`perFrame` in `libs/backend-api/src/lib/models/group.ts`).
This is one of the most informative things the engine can say — it's the only
place a device quietly running at a quarter of the asked-for speed becomes
visible (per the doc comments in `device-dialog.ts` and `participant-card.ts`).

Today, `GroupStatus` — which carries these figures — is only re-read after
the frontend issues a group **command** (`application-store.ts::getGroups`
is called at the end of every `createGroup`/`startGroup`/`setGroupMembers`/…
call). Nothing re-reads it while a group just sits there running. The
dashboard opened and left alone shows the achieved rate **at the moment it
was opened**, forever, even as conditions on a device change.

## What "done" looks like

The dashboard, left open on a running group, shows achieved-rate figures
that are no more than a few seconds stale — without the user touching
anything.

## Open design question for `backend`

Two shapes would work; `backend` should pick one and message `frontend` and
this ticket's owner with the contract before frontend starts:

- **Poll**: frontend calls `groups` on an interval (a few seconds) while any
  group is running. Simplest, no new command, costs a Tauri IPC round trip
  per tick — cheap, since `state.groups()` is an in-memory read
  (`razer/state.rs::groups`), not a device round trip.
  Consider gating this by whether any group is running, and by
  window-visibility, so a hidden window (see lifecycle behaviour in
  `features.md` §7) doesn't poll pointlessly.
- **Push**: the engine already ticks internally at the group's cadence; a
  Tauri event carrying fresh `GroupStatus` (mirroring how `devices_changed`
  and `twinkly_devices_changed` already work — `watch.rs`) would avoid
  polling and match the existing pattern. More backend work, no wasted round
  trips.

Either way: this must **not** run in browser/mock mode as a real interval
that never resolves anything meaningful — the mock should answer with
something a story can assert against per the mock-first rule (root
`AGENTS.md` §7).

## Acceptance criteria

- [ ] With a group running under Tauri + fake daemon, the achieved-rate line on a participant card / device dialog updates within a few seconds of a real change, with no user action (no click, no navigation, no reload).
- [ ] The dashboard, left open with no groups running, does not spam the backend (verify via devtools/logs — no continuous polling with nothing to report).
- [ ] Browser/mock mode has an updated mock demonstrating the same behaviour (root `AGENTS.md` §7 — mock-first), and a story or spec exercises it.
- [ ] `tsc --noEmit` on `backend-api` passes after the contract change (if any).
- [ ] `qa`: with `openrazer-fake.sh` running, start a group, watch the achieved-rate figure on screen for at least 15 seconds without touching the UI, and confirm it visibly reflects a live number rather than a frozen one (e.g. by changing cadence on a second window/MCP call and observing the figure follow, if push; or simply timestamp-diffing successive reads, if poll).

## Notes

This is not blocking the "ambience across Chroma and Twinkly" goal directly —
the ambience itself already applies live (§1 of the inventory, "push an
ambience change to a running group" is ✅). This ticket is about the
**status/telemetry** readout being honest while idle, which matters for the
QA report's credibility more than for the core feature working.
