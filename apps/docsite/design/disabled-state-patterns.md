# The pattern for saying a control doesn't reach the hardware

Written for `frontend`'s control inventory. [Capability states](/design/capability-states)
already answered _why_ a control might be inert at runtime — structural vs.
transient hardware absence. This page answers the question that inventory
actually raised, which is different: most of what's inert today isn't a
hardware limit at all, it's **this project's own build progress**, and
using hardware-absence language for that would itself be dishonest in the
other direction.

## A third axis, not a restatement of the first one

Capability states drew one line: **structural** (this device instance
cannot, ever) vs. **transient** (can't reach it right now). That line lives
entirely on the hardware side. The inventory surfaces a line that has
nothing to do with hardware at all: **has this project wired the call
yet.** A control can be doing-nothing for either reason, and they need
different words, because they make different promises:

|                                | The device   | This project                                          |
| ------------------------------ | ------------ | ----------------------------------------------------- |
| **Capable, wired**             | can do it    | calls it — the only state that should look fully live |
| **Capable, not wired**         | can do it    | hasn't called it yet — "coming soon" is true          |
| **Not capable**                | cannot do it | nothing to wire — "not supported" is true             |
| **Unknown which of those two** | ?            | don't know yet — neither word above is safe to say    |

Getting a control into the wrong row is exactly the failure this whole
review exists to catch — the battery indicator (below) is what happens
when a control claims row 1 while actually sitting in a row that doesn't
exist at all.

## Reclassifying the inventory against what's actually on the wire

Before assigning words, the groups in the inventory need checking against
`libs/openrazer/src/request.rs`'s `CATALOGUE` (the exhaustive list of every
capability Rust knows how to ask the daemon for) and the discovery
mechanism already built around it (`supported_from`, filtering by which
DBus methods a device's own introspection reports) — this is the exact
per-instance, per-method discovery [capability
states](/design/capability-states) asked backend to build, and it already
exists. One reclassification matters:

- **Polling rate belongs with DPI and lighting, not with gaming mode.**
  The lead's own probe found `getPollRate`/`setPollRate` live on
  `razer.device.misc` for one mouse. That means the daemon _does_ expose
  it — Rust's `CATALOGUE` just hasn't grown an entry for it yet, the same
  gap DPI, brightness, the five Chroma effects and battery were in before
  someone wrote the routing arm. "Not supported" would be **false** for
  polling rate on a device that answers it. It belongs in "coming soon,"
  same tier as effects/brightness/DPI/"apply to all"/battery, not in "give
  up."
- **Gaming mode, snap-tap, key bindings, and the camera panel's controls
  are a genuinely open question**, not a known "coming soon" and not a
  known "never." Nothing in `CATALOGUE`, in `capabilities/*.rs`, or in the
  lead's probe says whether OpenRazer's DBus surface has anything for
  macro/key-rebinding or camera image parameters on _any_ device — this
  needs a real answer from `backend`, the same way DPI staging needed one
  (and got it: OpenRazer's DPI interface has no on-device stage table for
  any mouse — see [DPI staging](/design/dpi-staging)). Until that answer
  exists, neither "coming soon" nor "not supported" is a sentence anyone
  can stand behind for these four.

## The words, mapped to the reclassified rows

Reuses exactly one piece of existing, already-shipped copy rather than
inventing three new tones:

- **"Coming soon."** — capable, not wired. Reserved for rows the daemon
  has already confirmed it can do: lighting effects, brightness, "apply to
  all," DPI (plain value; staging is [its own, separate
  decision](/design/dpi-staging)), polling rate, battery. This is a
  promise — treat adding something to this bucket as a decision that
  needs a real "yes, feasible" behind it, the same discipline that already
  applies before calling something Coming Soon anywhere else, because
  using this word for something that turns out to be permanently
  impossible is the same lie in the other direction.
- **"Not implemented yet."** — the existing `SOURCES_UNAVAILABLE` copy,
  verbatim, unchanged. Its virtue is that it commits to nothing: it is
  true whether the answer turns out to be "coming soon" or "never,"
  which is exactly the right thing to say about gaming mode, snap-tap, key
  bindings and the camera panel **until `backend` confirms which.** Do not
  upgrade these to "Coming soon" pre-emptively — that's a promise nobody
  has confirmed can be kept.
- **A sharper, permanent phrasing** — for a capability `backend` has
  _actively confirmed_ is not reachable through OpenRazer at all, for any
  device, the way DPI staging turned out to be. Something like _"Not
  reachable through the OpenRazer daemon."_ — distinct from the per-device
  "not supported by this device" language in [capability
  states](/design/capability-states), because the reader benefits from
  knowing whether the wall is _their mouse_ or _the whole platform_.

## What a disabled panel looks like at each of the three scales `frontend` asked about

One visual language — a muted/dimmed treatment plus a stated reason — but
**the reason is written once, at the smallest scope that is uniformly
true**, not repeated per control. That single rule answers all three
scales:

- **One control inside an otherwise-live panel** (autofocus dead next to a
  live preview toggle; DPI dead next to brightness once brightness is
  wired): the existing `sources-panel` treatment, unchanged — that control
  disabled, its own one-line reason directly beneath it. Nothing new to
  design here; this is already the right pattern and the inventory's own
  precedent.
- **A whole panel, inside a tab that has other live panels**: the reason
  moves to the **panel's own header**, once, and every control inside it
  is disabled without repeating the sentence six times. Six individually
  disabled switches each captioned "Not implemented yet" reads as noise —
  a gaming-mode panel with one header line and six quietly disabled
  switches reads as one clear statement.
- **A whole tab** (mouse Power: two panels, neither does anything today):
  this is where "coming soon" and "not implemented yet" **diverge in
  treatment, not just in wording**. A tab that will genuinely work once
  wired should **stay in the tab bar**, with the "Coming soon" banner at
  the top of the tab and its controls dimmed beneath it — removing the tab
  entirely would say "this device has no power settings," which is false
  the moment it's wired. A tab whose fate is still the open "unknown" row
  above should stay too, captioned "Not implemented yet" the same way,
  precisely because nobody can yet justify removing it (that would assert
  "never," which isn't known either). **Only structural absence — the
  device genuinely cannot, confirmed by discovery — removes a tab**, per
  [capability states §2](/design/capability-states#2-what-does-a-page-look-like-at-two-working-controls-out-of-six).
  Development status never removes a tab; it only changes what the
  banner says.

## `lighting-switch-off-panel`: delete it

Not a "coming soon," not a "not implemented yet." Every other inert
control in the inventory at least _holds_ a value somewhere, even if
nothing reads or writes it past the component boundary — this one has an
empty component class and an unbound checkbox: nothing is stored, nothing
is planned, there is no state to eventually wire up when someone gets to
it. Disabling it with a reason would claim a roadmap intent that doesn't
exist anywhere in the codebase, which is a different and smaller
dishonesty than the ones above but the same shape. Delete it. If "goes
dark when the display turns off" becomes a real feature later — and it may
not even be a device-side setting at all; that behaviour is at least as
likely to be this application watching the OS's display-sleep signal and
calling `SetChromaNone` itself as it is anything OpenRazer exposes — it
gets built with real state behind it, which is an ordinary feature
addition, not a resurrection of furniture.

## The battery indicator outranks all of the above

Agree with `frontend`'s own ranking, and want to be explicit about why
this one isn't a "which word" question at all: **62%, not charging,
hardcoded, on every mouse, forever** isn't inert, it's a display asserting
something false about hardware that was never asked. No disabled-state
treatment fixes a lie — showing "Battery — Coming soon" instead of a fake
percentage is strictly better than what's there today, but the real fix is
simpler than any pattern in this document: stop rendering a value nothing
measured. This should not wait for the rest of this pattern to land.

## Sequencing: fix the tab reset before applying any of this

`frontend`'s own find — every `model()` in an unwired panel resets when
the page switches tabs and back — needs fixing **first**, independent of
which words or visual treatment eventually land on top of it. Two
reasons: it is a plain correctness bug regardless of what the control's
eventual disclosure state is (a value vanishing on tab-switch reads as
broken whether that control is destined to be wired, disabled, or
deleted); and building the disabled/coming-soon treatment on top of a page
that still forgets its own displayed state means redoing the layout once
the reset is fixed anyway, rather than once. Fix the reset, then apply the
words above, then wire the real calls per `po`'s Track B — in that order.
