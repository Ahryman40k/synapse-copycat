# 0007 — Wire DPI (mouse → performance → sensitivity)

**Superseded by a split — see `0007a` and `0007b` below. This file stays as
the history of how we got there.**

## What changed, and why

My first pass at this ticket made a unilateral call to **delete** the
sensitivity panel's staged-DPI toggle, on the grounds that no OpenRazer
device publishes stage support on the wire (`razer.device.dpi` exposes only
`getDPI`/`setDPI`/`maxDPI` — confirmed independently by both the lead's
daemon probe and `backend`). **The lead corrected this**: deleting
user-visible UI is the maintainer's call, the same way "hide the inert
pages vs. wire them for real" was — not something to resolve by ticket. My
recommendation also turned out to be substantively wrong, not just
procedurally out of process: `ux` designed a real alternative
(`apps/docsite/design/dpi-staging.md`) — the five-stage concept is not a
device feature to keep or drop, it's an **application-owned** one, and
`core/models/key-binding.ts` already declares a `SensitivityAction` type
(`stage-up`/`stage-down`/`cycle`/`clutch`) that only makes sense if the app
holds the stage list and an index into it. Staging was half-built and never
connected, not absent.

The lead scoped the resulting work as two tickets, which stand:

## `0007a` — ships now

The stage **list**, stored and applied by the application: clicking a stage
makes it active and writes it to the device via plain `setDPI`. No new
backend capability beyond what discovery (`0006`) and DPI itself already
provide.

**Owner:** `frontend` (per the Track B re-scoping — this and the rest of
the "already-routed" capabilities need no new Rust; see `plan.md`).
**Depends on:** `0006` (done), and **`0020`** (the tab-switch state-loss
fix) — the lead's instruction is explicit that `0020` lands _before_ this,
not after, so five stages vanishing on a tab switch is never mistaken for a
bug in the new staging work.

**Acceptance criteria:**

- [ ] The stage list is real application state with a real home that survives the dialog closing — `wallpapers-store.ts` is the named precedent: a root-provided, per-feature store via a factory, not a module-level constant.
- [ ] Clicking a stage applies it to the device via `setDPI` and the panel reflects the device's actual current value on open (not an assumed stage).
- [ ] Staging is gated by **the same** capability check as plain DPI — there is nothing on the wire that distinguishes "supports staging" from "supports DPI at all," so there must be no separate, second gate invented for it.
- [ ] **The UI is honest about what this is**: `ux` is writing the treatment, but the acceptance bar is that nothing here implies a button on the mouse can cycle stages (that's `0007b`, unresolved) — a stage list that looks like Windows Synapse's while implying more than it delivers repeats exactly the failure this whole effort exists to fix.
- [ ] `0020` is confirmed landed first.
- [ ] Wire schema follows root `AGENTS.md` §6.
- [ ] `qa`: verify against the fake daemon — clicking each stage changes what a subsequent `GetDpi` reports; the stage list survives closing and reopening the device dialog.

## `0007b` — blocked, do not schedule

Binding a physical mouse button to `stage-up`/`stage-down`/`cycle`/`clutch`
— the actual point of staging for the use case that wants it, and a real,
named reduction from Windows Synapse parity if it never lands.

**Blocked on a feasibility question put to `backend`**: can a physical
button press reach this application at all? The lead's expectation is that
OpenRazer handles buttons in the daemon/driver without publishing input
events to userspace clients, which would make this **unreachable by this
architecture**, not merely unscheduled. Timeboxed answer requested from
`backend`. Do not treat this as ordinary backlog until that answer lands —
"blocked on feasibility" and "not prioritised yet" are different states and
this is the first one.

## Standing process note, recorded in `plan.md`

**Removing a user-visible control is the maintainer's tier of decision, not
a ticket to write unilaterally** — same tier as the original "hide vs. wire
vs. ship inert" call on the five device pages. `0015` (the lighting-switch-off
panel) is a live case of the same question and has been moved to "awaiting
maintainer decision" accordingly.
