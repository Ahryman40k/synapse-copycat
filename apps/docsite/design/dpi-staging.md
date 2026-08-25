# DPI stages: what the panel implies, and what the hardware has

Written to unblock ticket `0007`. Same family of question as
[capability states](/design/capability-states) — what a control should do
when the device cannot do the thing the UI implies — but this one is not
solved by disabling anything, because the mismatch is not "temporarily
unreachable" or "this unit lacks the interface." It is that **the concept
itself does not exist on the wire**, on any Razer mouse OpenRazer speaks
to.

## What is actually there

Confirmed by reading `libs/openrazer/src/capabilities/dpi.rs`: three
capabilities exist — `GetDpi`, `SetDpi`, `GetMaxDpi` — one value pair, read
and written directly, nothing else. Confirmed again by the lead's probe of
the running daemon: `razer.device.dpi` exposes exactly `getDPI`, `maxDPI`,
`setDPI` on both mice tested, no stage table, no "current stage index," no
way to ask the device to remember five values and cycle between them.

This is not a per-device gap in the sense [capability
states](/design/capability-states#the-one-distinction-that-resolves-three-of-the-four-questions)
describes — it is not that _this_ mouse lacks a stage table _this_ other
mouse has. Nothing in OpenRazer's DPI interface, for any device, has ever
had one. **Sensitivity staging on real Razer hardware, under Windows
Synapse, is a firmware feature this Linux daemon does not expose at all** —
whether that firmware feature is unreachable through OpenRazer or does not
exist in OpenRazer's model of the device is not this page's question to
answer, only backend's; either way, the UI has to stop assuming it can ask
the device to hold five numbers.

So `sensitivity-panel.ts`'s `Sensitivity` type (`staged`, `dpi`, `stages`)
was never a description of something the device does. It is, and always
was, a description of something **the application would have to do**.

## The decision: keep it, and move where it lives

Not "remove staging" and not "invent a new concept" — **the concept the UI
needs already exists elsewhere in this codebase, unconnected to this
panel.** `assignment-editor`'s key-binding model
(`core/models/key-binding.ts`) already has:

```ts
export type SensitivityAction = 'stage-up' | 'stage-down' | 'cycle' | 'clutch';
```

A button bound to `stage-up` only makes sense if something other than the
device is holding a list of values and an index into it, and stepping that
index is a software action, not a firmware one. Whoever designed the
key-binding model already assumed DPI staging is application-owned — the
sensitivity panel and the assignment editor are two halves of one feature
that were simply never wired to each other, or to anything real. This
finding does not require inventing a new design; it requires recognising
one that is already half-built and finishing it consistently.

**The rule**: staging is state the application keeps and applies, one
value at a time, over the same plain `setDPI` every non-staged mouse
already uses. Nothing about it needs a new device capability — it needs a
home for the state, and a UI that shows which of the held values is
current.

## What "application-owned" changes, concretely

1. **The model needs one more field**: `activeStage: number` (or
   equivalent) alongside `staged`/`dpi`/`stages`. Today's `Sensitivity`
   describes five edited values with no notion of which one the mouse is
   currently running — there is no way, even in principle, to know that
   without one.
2. **It needs to be persisted somewhere real**, not a component `model()`
   that forgets on close. This is the same trust problem as every other
   per-device control ([usability
   findings](/design/usability-findings#per-device-controls-write-nowhere))
   — staging is the one control on this whole page where "persist it
   properly" cannot lean on the device at all, because there is no device
   side to lean on. If this one is wired sloppily, there is no hardware
   fallback to fall back to.
3. **The only device-side action, ever, is `setDPI` with whichever value
   is active.** Gating for staging is therefore identical to gating for
   plain DPI — if a device answers `GetDpi`/`SetDpi`, staging is offered;
   if it does not (a device with no sensor at all), the whole Sensitivity
   panel is structurally absent, per [capability
   states, §1](/design/capability-states#1-hidden-or-disabled-with-a-reason).
   **Staging is never its own capability gate** — do not build a second
   `InterfaceUnsupported` check for it; there is nothing on the wire to
   check.
4. **Three ways to change the active stage, and they are not equally
   ready to ship:**
   - **In the panel, directly** — click a stage to make it the one
     running now. New UI (today's panel only edits the five values, it
     never applies one), but needs nothing new from `backend` beyond the
     `setDPI` call that already exists. **This is the part that can ship
     in `0007` on its own.**
   - **A bound button, via `stage-up`/`stage-down`/`cycle`** — reuses
     `assignment-editor`'s existing model, but depends on a physical
     button press reaching this application at all. **How that happens is
     an open backend question, not a design one**: OpenRazer's own
     button-remap mechanism needs checking before this can be scoped, and
     it is called out here as a dependency rather than answered, because
     it is not mine to answer.
   - **`clutch`** (hold to drop to a value, release to return) — same
     dependency as above, plus needs a "held" state the plain button
     actions don't.

## The expectation this sets, and why `0007` should say it out loud

Until the button-bound paths exist, "staged" mode is **a saved list of DPI
presets you switch between inside the app** — not the on-the-fly,
eyes-on-the-game flick a physical DPI button gives a Windows Synapse user,
which is the entire point of staging for a competitive player (see the
[Windows Synapse veteran persona](/design/personas#migration-the-windows-synapse-veteran)).
Shipping only the panel-click path and calling it "DPI stages" risks
repeating the exact failure mode this whole design review exists to catch:
a control that looks like the thing the user expects and quietly is not
that thing yet. Better for the ticket to say plainly which slice is
shipping first — a preset list, useful on its own — and name the button-
bound cycling as a distinct, dependent follow-on, than to let the label do
work the feature does not yet do.

## Wireframe: the panel with an active stage

```
Sensitivity Stages  ●━━○

Stage 1   850 dpi   [ Use this stage ]
Stage 2  1800 dpi   ● Active
Stage 3  4000 dpi   [ Use this stage ]
Stage 4  9700 dpi   [ Use this stage ]
Stage 5 20000 dpi   [ Use this stage ]
```

Each row keeps its existing slider for editing the value; "active" is a
new, separate affordance from "editing," the same distinction the ambience
panel already draws between choosing a source and tuning it. Editing a
stage that is currently active should write through immediately (the
device is already running that value) — editing one that isn't active
should not touch the device at all until it is selected.

---

_Answers the design half of `0007`. The open technical dependency — how a
physical button reaches the application at all — belongs to `backend`, and
this page deliberately stops at naming it rather than guessing at it._
