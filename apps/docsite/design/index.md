# Design

This section is the UX design record for Synapse: who it is for, the flows
it needs to support, what the current build already gets right, and what it
does not yet. It is written to be read start to finish once, then kept as a
reference — each page stands alone and cross-links the others.

**Scope of this pass**: the dashboard-centred build on branch
`10-integrate-ai` — groups, ambiences, the background manager, per-device
dialogs, settings. **Govee is out of scope this round** — the devices in
question don't answer on the LAN, are almost certainly Bluetooth, and this
machine has no Bluetooth adapter to test against; the product's job is to be
honest about that absence (a disabled, reasoned switch), not to hide it, and
that honesty is assessed on the [personas](/design/personas) and
[wireframes](/design/wireframes) pages rather than skipped.

**Method, stated once here so it isn't repeated on every page**: no user
interviews or surveys happened — there is no panel to run them against.
Every claim below was produced one of three ways, and each page says which:
reading the actual Rust and TypeScript source rather than assuming from a
template; driving the real running application (`pnpm exec nx serve
synapse`, the mock backend, a real headless Chromium via Playwright) and
recording what happened, including two screenshots' worth of real console
errors; or, for the personas only, reasoning from the competitive landscape
(Razer Synapse, OpenRazer, Polychromatic, Razer Axon) and labelling the
result an assumption. Nothing here is a fabricated quote or an invented user.

## Start here: the two flows the maintainer sent back

The user flows for background management and the effect studio were
description, not design — accurate about the current build, and not useful
for deciding what it should become. Redriven live and redesigned, in the
order asked for:

1. **[Background management, redesigned](/design/backgrounds-flow)** — the
   point of this page is one room matching one screen, not two independent
   buttons; driving it live found a confirmed bug (a wallpaper's palette is
   mislabelled "Rainbow" in the group summary), a real gap (no way to tell
   which photo is currently lighting a group), and a route that can't find
   its groups on a direct load. Proposes one combined action in place of
   two disconnected ones.
2. **[Effect studio, redesigned](/design/studio-flow)** — checked what
   `ColourSource` can actually hold before designing anything: a closed,
   three-variant enum with no persistence anywhere. Reframes the page from
   "author new colour math" (not buildable without a backend change nobody
   asked for) to "name and save a palette so it appears as a fourth choice
   everywhere a colour source is picked" — the thing the page's own copy
   already promises.

Both supersede the shallower coverage of the same two flows below.

## Read in this order

1. **[Personas](/design/personas)** — three evidence-based personas (the
   desk owner, the Windows Synapse migrant, the ambient-lighting hobbyist),
   what the product already does for each, where each one gets stuck, and
   an explicit list of who this is not built for yet.
2. **[Flows](/design/flows)** — first launch with and without devices,
   discovering devices, creating a group, assigning a device (pointer and
   keyboard paths), authoring an ambience, picking a wallpaper-derived
   palette, and the two failure flows — no daemon running, and a device
   disappearing mid-scene. Each step is grounded in a named file or a
   reproduced action, not asserted.
3. **[Wireframes and site map](/design/wireframes)** — the product's four
   real routes and two dialogs, laid out as text wireframes, each annotated
   with what matches the current build and what diverges from it. Most of
   it matches; the divergences are called out precisely so they don't get
   lost in a page that is otherwise agreement.
4. **[Usability findings](/design/usability-findings)** — concrete,
   reproducible problems found by actually using the running build,
   written as what-I-did / what-happened / what-should-happen, ranked by
   severity. These are candidate tickets, sent to `po` directly.
5. **[Accessibility](/design/accessibility)** — an audit of the keyboard
   equivalent for drag-and-drop specifically (the CDK provides none, and
   neither does the platform), plus a short pass over what else is already
   right and what else is not.
6. **[Capability states](/design/capability-states)** — written ahead of
   the per-device pages being wired for real: what a control does when its
   device can't do it, when a write is in flight or refused, what happens
   if the daemon vanishes mid-write, and how a device's own lighting
   defers to the group it belongs to. Grounded directly in the backend's
   existing `BackendError` taxonomy rather than inventing a new one.
   ⚠️ Structural absence is decided **per device instance, at method
   granularity** — never per kind or model; two otherwise-identical mice
   can differ on a single capability.
7. **[DPI staging](/design/dpi-staging)** — the sensitivity panel's
   five-stage mode has no hardware behind it on any Razer mouse OpenRazer
   speaks to; the decision is to keep staging and move its ownership from
   an implied device feature to one the application actually keeps and
   applies, reusing a key-binding model that already assumed exactly that.
   Unblocks ticket `0007`.
8. **[Disabled-state patterns](/design/disabled-state-patterns)** — a
   different axis from capability states: most of what's inert today is
   this project's own build progress, not a hardware limit, and needs
   different words ("Coming soon" vs. "Not implemented yet" vs. a
   confirmed-permanent phrasing) and a different visual scale (per
   control, per panel, per tab). Also settles the battery indicator (a
   lie, not an inert control — fix it first) and the empty
   `lighting-switch-off-panel` (delete it).

## The three findings worth reading even if nothing else

If only one thing from this whole section reaches an engineering backlog,
it should be these three, because all three are trust problems rather than
polish problems — each is a moment where the interface tells the user
something false about what just happened, not merely something incomplete:

- **Every per-device control except the Twinkly strip's writes to nothing
  but Angular state.** DPI, macros, key rebinding, lighting effects, power
  settings — a user changes one, sees it "work," and nothing has reached
  the hardware, with no disclosure anywhere in the running interface. See
  [usability findings](/design/usability-findings#per-device-controls-write-nowhere).
- **The dashboard's "Modules" tile throws an uncaught `RuntimeError`** —
  confirmed by clicking it in a real browser, not inferred — because
  `app.routes.ts` has no route for what `Navigation.openModule` constructs.
  See [usability findings](/design/usability-findings#module-tile-throws-a-runtime-error).
- **A wallpaper's palette, given to a group, is announced as "Rainbow."**
  Found by actually giving a photo's colours to a group and reading the
  result, not by inspecting the template — the live preview is correct, the
  one-line summary beside it is not. See [background management,
  redesigned](/design/backgrounds-flow#1-the-group-cards-summary-line-lies-about-a-palette).

Everything else in this section is real, but ranks below those three.
