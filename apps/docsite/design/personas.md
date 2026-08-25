# Who this is for

## Method, stated plainly

No interviews and no surveys happened for this page — there is no user panel
to run one against. What follows is built instead from:

- what the codebase actually implements and how carefully it talks about its
  own gaps (the `⚠️` comments and the features page are unusually honest about
  this, and that honesty is itself evidence of who the maintainer imagines
  reading it),
- the shape of the competitive landscape — Razer Synapse (Windows), OpenRazer,
  Polychromatic, and Razer Axon's "Chroma Generate" (a wallpaper-to-RGB feature
  that is the same idea as this project's [background manager](/design/flows#picking-a-wallpaper-derived-palette)),
  and
- ordinary inference about who owns Razer peripherals _and_ runs Linux, which
  is a narrower population than "owns Razer peripherals."

Every persona below is a composite, not a person. Anything not directly
supported by the above is marked **Assumption**. Treat a persona as a tool for
making trade-offs, not as a fact.

---

## Primary: the desk owner

> Wants their desk to look like one thing, not a pile of vendor apps.

**Evidence for this persona existing at all:** the product's own framing.
`AGENTS.md` and the dashboard's doc comment both describe the pivot from
"one card per device" to "the group is the subject" as a deliberate choice —
the maintainer built for someone who thinks in terms of _the desk's mood_, not
_my mouse's settings_. The docsite home page's tagline — "group your
peripherals, give the group an ambience" — is written to this person, not to
a device tinkerer.

- **Setup**: a keyboard, a mouse, a mouse mat, maybe a headset, on Linux
  (any distro with OpenRazer packaged — Arch, Fedora, or Ubuntu with a PPA).
  **Assumption**: they installed OpenRazer once, added themselves to
  `plugdev`, and do not want to think about it again.
- **Goal**: one ambience across everything on the desk, changed occasionally
  (mood, time of day, a wallpaper they like), not tuned per key.
- **What "done" looks like to them**: open the app, everything is already
  lit the way they left it, or they drag a photo's colours onto the desk and
  it matches.
- **Where the product already serves them well**: the first-run behaviour
  (`Conductor::with_everything` — see `apps/synapse/src-tauri/src/razer/state.rs`)
  puts every found device in one running group with no setup. The ambience
  panel's three independent channels match how they'd describe a mood in
  words ("green, still, full brightness") rather than in a raymarching shader
  parameter.
- **Where they will get stuck**: the moment they open a device's own tile
  expecting Synapse-parity — DPI stages, macro rebinding — and find controls
  that accept input and change nothing on the hardware, silently. See
  [usability findings](/design/usability-findings) — this is the single
  highest-severity issue for exactly this persona, because they have no
  reason to suspect it.

---

## Migration: the Windows Synapse veteran

> Used Razer Synapse for years, switched to Linux, expects the same depth.

**Evidence**: the sheer amount of per-device UI that already exists —
`assignment-editor` (key rebinding), `sensitivity-panel`, `polling-rate-panel`,
`snap-tap-panel`, `gaming-mode-panel`, `low-power-mode-panel` — was clearly
built _toward_ Synapse-on-Windows feature parity, not toward the ambience
model. That is a second, older design intent still visible in the tree,
serving a different persona than the one the dashboard rewrite now centres.
**Assumption**: this person still exists among likely users, is probably more
technical than the desk owner (they are running Linux by choice, possibly for
gaming), and cares about per-key remaps, DPI stages and macros in a way the
ambience model has nothing to say about.

- **Goal**: replace Synapse 1:1 — macros, sensitivity stages, per-key RGB,
  battery status.
- **Where the product fails them today, specifically**: every one of the
  controls above (§13.8, and confirmed directly — nothing under
  `apps/synapse/src/app/domains/devices/**` calls the backend except the strip
  page) writes to Angular component state and nowhere else. Battery is a
  hardcoded stand-in (`mouse-page.ts`, `battery = signal({ level: 62 })`,
  commented as such). None of this is disclosed in the running interface —
  only in source comments and the docsite features page, which this persona
  is unlikely to read before trying the controls.
- **Risk this persona represents**: they will conclude the product is
  unfinished or unreliable _specifically because it looks finished_ — full
  pages, tabs, sliders, key-capture — with no control that says "this one
  doesn't do anything yet."

---

## Secondary: the ambient lighting hobbyist

> A Razer keyboard is incidental; the desk and the wall behind it are the
> point.

**Evidence**: Twinkly support existing at all, driven over the network rather
than through OpenRazer, and the background manager's explicit three-step
pitch — a folder of images, the colours cut from them, and a group to give
those colours to. This is the same product idea as **Razer Axon's Chroma
Generate**, which scans a wallpaper for dominant colours and produces a
matching Chroma profile — evidence that this is a real category of user Razer
itself targets, not a feature invented in a vacuum. **Assumption**: this
persona has, or wants, more than Razer hardware — string lights, an LED strip
behind a monitor — and is the population most let down by Govee being a
disabled switch.

- **Goal**: the whole visible area (desk + wall + shelf) reads as one
  coherent scene, ideally following something ambient — a photo, the time of
  day — rather than something they tune by hand each time.
- **Where the product serves them**: the background manager's palette
  extraction, the circadian brightness source, and Twinkly as a first
  non-Razer protocol are aimed squarely here.
- **Where they will get stuck**: **Govee is the second protocol most people
  in this category actually own** (it is the market's low-cost, high-volume
  ambient strip brand), and it is a switch that is honestly disabled rather
  than lying — which is the right call, but the settings page's explanation
  ("Not implemented yet") is the only place that says so. Someone who came in
  specifically for Govee support will not read Settings before looking for
  a "add a light" button elsewhere and finding none.

---

## Who this is explicitly not built for yet

Naming this is as useful as naming who it is for:

- **Competitive players who live in per-key macros and DPI stages** — the
  migration persona above, until §13.8 and the per-device wiring gap close.
- **Govee, Hue or Nanoleaf owners** — a labelled, disabled switch and nothing
  more. Correctly honest; still a wall.
- **Anyone whose devices are Bluetooth-only** — out of scope for this round
  per the team's own constraint, and worth being equally honest about in the
  product rather than only in team chat.

---

_Personas are inputs to `/design/flows` and `/design/usability-findings`, not
a deliverable in themselves — read those for what to build._
