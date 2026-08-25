# Backlog — status as of stand-down

**This is no longer a work queue.** The maintainer's direction, relayed by
the lead: stop creating and assigning new work; `backend`, `frontend` and
`qa` finish only what was already in flight, then stand down. `ux` keeps
working — the maintainer asked them directly for the background-management
and effect-studio redesigns — but nothing else gets ticketed from their
findings either.

What follows is the backlog as it stood when the stand-down landed:
everything that was decided, everything that shipped, everything that was
authorised but never started, and everything still waiting on the
maintainer. Nothing here should be read as an instruction to anyone — it's
the record of what happened and what didn't, for whoever picks this up
next. See `apps/docsite/product/open-decisions.md` for the consolidated
list of everything specifically awaiting the maintainer's call, and
`features.md` for the authoritative inventory this backlog was ticketed
against.

## What actually shipped this round

- **The group/ambience engine** — already done before this round started; see `features.md` §1. The one thing that fully works, end to end, in all three modes.
- **`0001`** — the `modules` command and its dead TS concept removed, including the browser-reproducible Modules-tile crash (`NG04002`) `ux` found. Turned out bigger than scoped: removing it also removed the app bar's only data-driven, overflow-capable entries, so `frontend` removed the overflow-menu machinery with it (documented in `appbar.ts` for whoever needs it again). Done.
- **`0003`** — turned on IPC validation. Shipped wider than ticketed: all eleven wire call-sites (not just the two free schemas), including both hotplug events. 14 new tests, one of which runs the mock through the same validators as production specifically to catch mock/schema drift. Done.
- **`0005`** — the generated-bindings directory and both binding generators (`tauri-typegen`, `tauri-specta`) deleted on both sides, build confirmed clean on both. Done. Replacement drift-protection (shared golden JSON fixtures between Rust tests and TS schemas) was agreed between `backend` and `frontend` but not yet built when the stand-down landed.
- **`0004`** — verified and fixed, and it was worse than scoped: a second bug in the same method (`watchForChanges` aborting before subscribing to hotplug events at all, if the watch preference itself was refused) was found and fixed alongside the original. What copy the three now-distinguishable states should show is still open — see `open-decisions.md`.
- **`0006`** — capability discovery, built and tested. `capabilities(participant) -> string[]`, discovered at DBus **method** granularity (confirmed necessary: two devices sharing an interface can still differ on a single method — polling rate, chroma effects, brightness all had live examples). Independently confirmed to satisfy `ux`'s `capability-states.md` design with no rework needed on either side. Done.
- **`0012`** — a first run now persists itself immediately rather than waiting for the first change, with the deliberate exception that a first run finding _no devices_ still saves nothing (so the "everything drawing" welcome isn't spent on a machine whose daemon isn't installed yet). Done.
- **`ux`'s redesigns** — `apps/docsite/design/backgrounds-flow.md` and `apps/docsite/design/studio-flow.md`, both re-driven against the live app rather than the templates. Found three concrete issues along the way (see `features.md` §5 and `open-decisions.md`): a group card mislabels a palette-derived ambience as "Rainbow"; nothing distinguishes the wallpaper currently being browsed from the one actually lighting a group; the `/backgrounds` route has no resolver, so a direct load or refresh can't find any groups even though in-app navigation works fine.
- **The Playwright suite** — `qa` built `apps/synapse-e2e/src/journeys.spec.ts` against `journeys.md`, ten tests across the six core journeys, each citing which bullet it verifies and naming what covers the bullets it can't (mostly: Rust-layer tests already covering Tauri-only behaviour). Two gaps found and documented rather than worked around: the browser/mock path has no way to boot with zero devices (a testability gap in `app.config.ts`'s hardcoded mock fixture, reported to `frontend`), and the `alreadyTaken` race (§3's last bullet) isn't practically exercisable in either mode available here. Full detail in `apps/docsite/qa/report.md`.

## What was authorised or scoped but never started

The stand-down landed mid-sequence. These were real, agreed next steps with
nobody left to build them:

- **`0014`** — `darken` failing silently on a device without `SetChromaStatic` (confirmed live: the Basilisk Ultimate). This is the second half of a bug the maintainer had already reported once and believed fully fixed (the first half, for Twinkly, shipped as `e58d3ca`). Authorised as P0, ahead of everything else in Track B. `backend` had not begun it when the stop-work instruction arrived. **`backend` found a better fix than the one in the ticket before standing down**, worth recording here since it wasn't built: don't teach `darken` to consult capability discovery — `Runner::rest()` already darkens every device correctly, because it goes through whichever surface the device actually has (painting black on a matrix device, `setStatic` on an approximated one). `darken()` is a second, worse implementation of the same idea. The fix is de-duplication, not new capability-awareness. Also worth knowing: the engine currently avoids a _third_ failure mode by luck — the only device lacking `setStatic` (Basilisk) happens to be painted, and the only one lacking `setKeyRow` (Kraken) happens to be approximated; a device lacking both would break the engine, not just `darken`.
- **`0007a`** (DPI staging preset list) and everything sequenced after it (`0008`, `0009`, `0017`, `0018`, `0019`, `0020`, `0021`) — scoped, several with confirmed-cheap DBus findings from `backend`, none started.
- **`0011`** (daemon reconnect) — full policy specified (DBus `NameOwnerChanged` watch), never started.
- **`0016`** (circadian preview pinned to noon), **`0022`** (module-boundary tags) — scoped, never started.
- **`0013`** (unify the group-command error shape) — shape agreed by both `backend` and `frontend`, sequencing note attached (land with `Surface` extraction once the maintainer authorises that), never started.

## Standing rule, worth keeping for whoever resumes this

**Deleting user-visible UI is the maintainer's tier of decision.** Learned
mid-round: two unilateral "just remove it" recommendations (the staged-DPI
toggle, the lighting-switch-off panel) both needed correcting back to
"recommend, don't decide" — the same tier as the original "hide the five
inert pages vs. wire them for real" call, which the maintainer had already
answered by choosing the more expensive option. **Correction to an earlier
version of this note**: `0007`'s staged-DPI question was _not_ actually
resolved in-house by `ux`'s alternative design — `ux` asked directly that it
stay recorded as a live, two-position disagreement rather than presented as
settled (see `open-decisions.md` §1). Both it and `0015` follow the same
rule: when there's no unanimous alternative, escalate rather than decide.

## Everything still awaiting the maintainer

Consolidated in **`apps/docsite/product/open-decisions.md`** — read that
file for the full list with facts and non-binding recommendations attached
to each. Short index: the lighting-switch-off panel (`0015`), the app
identifier blocking packaging entirely (`0023`), the `Surface` protocol
abstraction and its sequencing with the error-shape unification, the CLI
channel, three CLAUDE.md corrections `frontend` prepared, and the copy for
`0004`'s now-three distinguishable device-source states.

**Resolved, no longer open**: the binding-generator choice (deleted, both
of them); the ambience-preview command (`ux`'s recommendation — leave it
unused, the existing client-side compositor already covers the real need);
snap-tap (`backend` confirmed genuinely absent on every fixture device
checked); the bundle-budget warning (resolved itself — `0001`'s removal
gave back more bundle size than `0003`'s validators cost, back to 495.55 kB
against the 500 kB budget with headroom to spare).

## A pattern worth naming, for next time

`backend` and `frontend` independently found the same shape of problem this
round: UI/API surface that exists, looks finished, and does nothing
(`frontend`'s five inert device-control categories; `backend`'s unused
`stop_all` and `preview()`). `ux` found a third instance from a different
angle (`getDevices()`'s missing error handling). `qa` found a fourth
(Storybook's play suite failing to even build, from leftover references to
the very concept `0001` was removing). None of these were hard to fix —
they were finished code with no caller, or a build nobody had watched fail.
Treating "is anything reachable that doesn't work, or already broken and
unnoticed" as its own review pass — not a byproduct of reading for
something else — paid off four separate times. Worth doing again, whenever
this resumes.

## Coordination rule, for the record

`ux` briefly stopped what they believed was an orphaned process and it
turned out to be the shared dev server on :4200, which `qa`'s Playwright
config runs against with `reuseExistingServer: true`. No harm done (caught
and restarted immediately), but worth keeping as a rule for next time: **do
not stop or restart a process you did not start.**

## Ticket index — final status

| #     | Title                                                                                   | Status                                                                                                                                                                    |
| ----- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0001  | Remove the `modules` command and its dead TS concept (incl. the Modules-tile crash)     | **Done.**                                                                                                                                                                 |
| 0002  | Live per-device status figures never refresh without a reload                           | Never started — needed a poll-vs-push design call first.                                                                                                                  |
| 0003  | Turn on IPC validation (`GroupStatus`, `Wallpaper`, and seven more found along the way) | **Done**, shipped wider than scoped (11 call sites, not 2).                                                                                                               |
| 0004  | `getDevices()` had no error handling; three states, not two                             | **Done** — and a second, worse bug in the same area found and fixed alongside it. Copy for the three states is an open decision.                                          |
| 0005  | Delete the generated-bindings directory and its tooling                                 | **Done** on both sides, build-confirmed. Replacement drift-protection (golden fixtures) agreed but not built.                                                             |
| 0006  | Capability discovery — the UI knows what a device can do                                | **Done.**                                                                                                                                                                 |
| 0007  | (superseded — see `0007a`/`0007b`)                                                      | Closed, split.                                                                                                                                                            |
| 0007a | DPI staging: the preset list                                                            | Scoped, never started.                                                                                                                                                    |
| 0007b | DPI staging: button-bound cycling                                                       | Blocked on a feasibility answer that was never obtained.                                                                                                                  |
| 0008  | Wire brightness (mouse/keyboard/mousemat lighting)                                      | Scoped, never started.                                                                                                                                                    |
| 0009  | Wire the Chroma hardware effects (static/spectrum/wave/breathe)                         | Scoped, never started.                                                                                                                                                    |
| 0010  | Wire the battery gauge (mouse page)                                                     | Scoped as P0, never started.                                                                                                                                              |
| 0011  | Reconnect to OpenRazer if it starts or restarts after the app                           | Fully specified, never started.                                                                                                                                           |
| 0012  | A first run never writes its groups to disk                                             | **Done.**                                                                                                                                                                 |
| 0013  | One error shape across all eight group commands                                         | Shape agreed by both sides, never built.                                                                                                                                  |
| 0014  | `darken` silently fails on a device without `SetChromaStatic`                           | Authorised P0, **never started** — a better fix than the ticket's was found and is recorded above.                                                                        |
| 0015  | The lighting-switch-off panel                                                           | **Awaiting maintainer decision.** See `open-decisions.md`.                                                                                                                |
| 0016  | Circadian ambience preview can't show anything but noon                                 | Scoped, never started.                                                                                                                                                    |
| 0017  | Wire polling rate (mouse → performance)                                                 | Scoped, confirmed cheap, never started.                                                                                                                                   |
| 0018  | Wire gaming mode (keyboard → customize)                                                 | Scoped; corrected by `ux` — not a 6-switches-vs-1-capability mismatch, but an unconfirmed daemon probe for `disableWindowsKey` specifically. Never run.                   |
| 0019  | Wire key/button rebinding (mouse + keyboard → customize)                                | Blocked on a `backend` spike that was never run — real risk flagged that the underlying capability may be the wrong concept entirely (sequence-recording, not remapping). |
| 0020  | Per-device control state resets when you switch tabs                                    | Scoped, never started.                                                                                                                                                    |
| 0021  | Wire wireless power saving (sleep-after, low-power threshold)                           | Scoped, confirmed cheap, never started.                                                                                                                                   |
| 0022  | `enforce-module-boundaries` enforces nothing                                            | Scoped, never started.                                                                                                                                                    |
| 0023  | The application identifier blocks packaging entirely                                    | **Awaiting maintainer decision.** See `open-decisions.md`.                                                                                                                |

Individual ticket files remain in `apps/docsite/product/tickets/` for
anyone who resumes this work — each carries the full context, acceptance
criteria, and the open questions that were live when work stopped.
