# Site map and wireframes

Text wireframes of the flows in [flows.md](/design/flows), each followed by
**Matches** (what the current build already does exactly this way — most of
it) and **Diverges** (where this design differs from what is built today, and
why). Most of the current build matches; this page exists to make the small
number of gaps explicit rather than to redesign a product that is already
mostly right.

## Site map

```
/                     redirect → /dashboard
/dashboard            Dashboard  (default route, always eagerly loaded)
  → New group dialog          (CDK Dialog, over the dashboard)
  → Device dialog              (CDK Dialog, over the dashboard)
      Customize | Performance | Lighting | Power    (mouse/keyboard/mousemat)
      Lighting                                        (strip — the one wired page)
      (no tabs — accessory kind has no page at all)
/studio               Effect studio     (lazy-loaded)
/backgrounds          Background manager (lazy-loaded)
/settings             Settings          (lazy-loaded, not in the bar's PLACES table)
/module/:kind         ⚠️ referenced by the appbar and the dashboard's Modules
                      section — NO ROUTE EXISTS. See divergence below.
```

Four real destinations, two dialogs layered over the first, and one address
the interface itself constructs and then cannot reach.

---

## Dashboard — first launch, no devices

```
┌─────────────────────────────────────────────────────────────┐
│ [logo]  SYNAPSE                                      ⚙      │
├─────────────────────────────────────────────────────────────┤
│ Ambiences                                                    │
│ ┌───────────────────────────────────────────────────────┐   │
│ │  No group yet. Everything below is waiting for one.    │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                                │
│ Waiting for a group                                           │
│ ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐   │
│ │  No Razer devices found.                                │   │
│ └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘   │
│                                                                │
│                       [ + New group ]                        │
└─────────────────────────────────────────────────────────────┘
```

**Matches**: exactly (`dashboard-page.html`'s `@empty` blocks).

**Diverges — proposal**: "No Razer devices found" reads identically whether
no daemon is installed, the daemon has nothing to report, or Chroma discovery
is switched off in Settings. A first-launch empty state is exactly the place
a short, specific line pays for itself:

```
│  No Razer devices found.                                │
│  Looking: Razer Chroma · Twinkly.  Check Settings if     │
│  something is plugged in and still not showing.          │
```

This does not require new backend state — `sources()` (already read by the
settings page) is enough to say _what was looked for_, which is most of what
a stuck user needs. Distinguishing "daemon absent" from "daemon says none"
needs the fix named in
[usability findings](/design/usability-findings#getdevices-has-no-error-handling)
first.

---

## Dashboard — a running group

```
┌─────────────────────────────────────────────────────────────┐
│ [logo]  SYNAPSE   EFFECT STUDIO   BACKGROUND MANAGER   ⚙    │
├─────────────────────────────────────────────────────────────┤
│ Ambiences                                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ALL DEVICES                                    ●━━○  🗑  │ │
│ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ (live preview strip)             │ │
│ │ ▸ #00ff00 · Still · 100%                                  │ │
│ │ 6 participants                                             │ │
│ │ ┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐┌──────┐│ │
│ │ │ [img]⣿ ││ [img]⣿ ││  ⣿     ││ [img]⣿ ││  ⣿     ││  ⣿   ││ │
│ │ │Basilisk││Huntsman││Tartarus││Goliathus││ Kraken  ││ Base ││ │
│ │ └────────┘└────────┘└────────┘└────────┘└────────┘└──────┘│ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                                │
│ Waiting for a group                                            │
│ ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐   │
│ │ ┌────────┐                                               │   │
│ │ │ Twinkly│ ⣿  (dark logo on dark card)                    │   │
│ │ └────────┘                                               │   │
│ └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘   │
│                                                                │
│ Modules                                                        │
│ ┌────────┐                                                    │
│ │ Twinkly│  ← clicking this throws NG04002, see below         │
│ └────────┘                                                    │
│                       [ + New group ]                        │
└─────────────────────────────────────────────────────────────┘
```

(`⣿` marks the drag handle button on each tile — always present, always a
keyboard-reachable equivalent to the drag it sits beside.)

**Matches**: the masonry layout, the disclosure summary sentence, the
per-tile achieved-rate line, the always-present tray and its drop zone, the
handle-based keyboard path — all confirmed against the real render, not just
the template.

**Diverges — three separate issues, ranked by severity**:

1. **`/module/:kind` has no route.** The dashboard renders a "Modules"
   section specifically to open one, and the appbar has the same entry a
   second time. Both call `Navigation.openModule`, which throws `NG04002:
Cannot match any routes` — confirmed by clicking it in a real browser, not
   inferred. This is not a cosmetic gap; it is a thrown `RuntimeError` from
   the only interactive element in that section. See
   [usability findings](/design/usability-findings#module-tile-throws-a-runtime-error).
2. **Three device kinds render with no picture at all** — keypad, headset,
   and dock in this mock's device set (`Razer Tartarus V2`, `Razer Kraken
Ultimate`, `Razer Base Station Chroma`). The card's own design already
   handles a missing image by dropping it rather than showing a broken
   `<img>` — reasonable, since a model with no artwork in the repository is
   a real and expected state, not a bug. What is missing is a **fallback
   glyph per device kind** (mouse / keyboard / mousemat / headset /
   accessory / strip) so an unpictured tile still reads as _a keyboard with
   no artwork_ rather than _a blank card_.
3. **The Twinkly artwork is illegible.** `assets/modules/twinkly.png` is
   dark cursive text on a transparent background, placed on this
   application's dark card background — both the module tile and the
   participant tile render as a near-black rectangle with no readable
   content. This is an asset problem, not a layout one; flagged here as a
   design finding, filed as a ticket in
   [usability findings](/design/usability-findings#twinkly-artwork-is-illegible-on-dark-cards).

---

## New group dialog

```
        ┌───────────────────────────────────┐
        │ NEW GROUP                          │
        │                                     │
        │ Name                               │
        │ ┌─────────────────────────────┐    │
        │ │ Desk                        │    │
        │ └─────────────────────────────┘    │
        │ It starts empty and stopped. Drag  │
        │ devices onto it, then run it.       │
        │                                     │
        │           [Cancel]  [Create]        │
        └───────────────────────────────────┘
```

**Matches**: content, focus-into-field, submit/cancel semantics via a real
`<form>` — all as designed.

**Diverges — proposal, minor**: the CDK dialog opens with **no visible
backdrop/scrim** in the current build (`hasBackdrop` is not overridden, but
nothing in `_appbar`/global styles darkens the page behind it) — the
dashboard behind the dialog remains at full brightness. Functionally the
dialog still traps focus and Escape still closes it, so this is a visual
clarity issue, not a functional one: a modal that does not visually recede
the page behind it reads, at a glance, like a panel that opened in place
rather than an interruption — worth a light scrim (the theming SDK already
has the tokens for it) purely so "this blocks the page" is legible before
the user has read anything.

---

## Ambience panel (inside a group's disclosure)

```
Cadence   [ Normal — 30 Hz  ▾ ]

┌ AMBIENCE ─────────────────────────────────────────────┐
│ Colour      [ One colour ▾ ]   ⬛ #00FF00               │
│ Motion      [ Still      ▾ ]                            │
│ Brightness  [ One level  ▾ ]   ───────●── 100           │
└──────────────────────────────────────────────────────────┘
```

When Colour → _A palette_:

```
│ Colour   [ A palette ▾ ]                                 │
│  ⬛×  ⬛×  ⬛×  [+]     (swatches, each removable, 1–8)      │
│  drift  ─●───────────  0                                 │
```

**Matches**: exactly, including the narrowing pattern (`fixedColour()`,
`palette()`, etc.) that lets the template avoid re-testing a union type per
field — a correctness detail, not a visual one, but it's why the panel
never shows a stale control for the wrong source kind.

**Diverges**: none found. This is the best-executed screen in the product —
every one of the three channels reads as a plain-language row, and switching
kinds remembers the last tuning. No wireframe change proposed.

---

## Device dialog

```
┌───────────────────────────────────────────────────────────┐
│ [img]  Razer Basilisk Ultimate Receiver          [Close]  │
│        XX0000000088                                       │
│        In All devices — not reporting                     │
├───────────────────────────────────────────────────────────┤
│ [CUSTOMIZE] [PERFORMANCE] [LIGHTING] [POWER]     🔋 62%    │
│                                                             │
│              (device artwork, dot grid)                    │
│                                                             │
│ ┌ CONTROLS ──────────┐  ┌ LEFT CLICK ─────────────────┐   │
│ │ Default / Hypershift│  │ [ Default ▾ ]               │   │
│ │  Left click          │  │ The control does what it    │   │
│ │  Right click          │  │ says on the device.         │   │
│ │  Scroll click …       │  └─────────────────────────────┘   │
│ └─────────────────────┘                                   │
└───────────────────────────────────────────────────────────┘
```

**Matches**: the header's `doing` line composing the right sentence for
every combination of group/started/status/skipped — confirmed by reading
every branch in `device-dialog.ts` against what rendered.

**Diverges — the most important finding on this page**: every control below
the tab bar, on every tab except the strip's, **writes to component state and
nothing else**. The `LEFT CLICK` panel's own caption — _"The control does
what it says on the device"_ — is not true yet for anything reached from this
dialog except `strip-page`. No visual affordance distinguishes a wired
control from an inert one. Proposed treatment, cheapest first:

```
┌ LEFT CLICK ────────────────────────────────────────────┐
│ ⚠ Not connected to the device yet — this choice is kept │
│   in the interface only.                                │
│ [ Default ▾ ]                                            │
└──────────────────────────────────────────────────────────┘
```

— i.e. reuse the same honest-disclosure pattern the sources panel already
uses for Govee ("shown disabled with a reason, never hidden"), applied at
the _tab_ level rather than inventing a new pattern. See
[usability findings](/design/usability-findings#per-device-controls-write-nowhere)
for why this is ranked above every other finding on this page.

---

## Background manager

```
┌───────────────────────────────────────────────────────────┐
│ Background manager                                          │
│ A folder of images, the colours in each of them, and a      │
│ group to give those colours to.                              │
│                                                                │
│ [ Choose a folder… ]                                          │
│                                                                │
│ ┌────┐┌────┐┌────┐┌────┐                                     │
│ │img ││img ││img ││img │   each with 4–6 colour swatches      │
│ │▪▪▪▪││▪▪▪▪││▪▪▪▪││▪▪▪▪│   underneath, in extraction order    │
│ └────┘└────┘└────┘└────┘                                     │
│                                                                │
│ ┌ chosen wallpaper ─────────────────────────────────────┐   │
│ │ (live palette-as-ambience preview strip)                │   │
│ │ [Set as wallpaper]  with swww     [Give to All devices] │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                │
│ ┌ What this machine has ────────────────────────────────┐   │
│ │ Found: swww — the first is used.                       │   │
│ │ (GNOME / KDE / XFCE / swww,hyprpaper,feh — table)        │   │
│ └──────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

**Matches**: exactly, including the deliberate separation of "set the
wallpaper" from "give the colours to a group" as two buttons rather than one
combined action, and the "what this machine has" panel naming its own
adapters rather than offering one control that works on some desktops and
not others.

**Diverges**: none found. This page's honesty about a genuinely hard,
fragmented Linux problem (no common wallpaper-setting API) is worth holding
up as the pattern for the "not connected to the device yet" disclosure
proposed above — same idea, applied one page later.

---

## Settings {#settings}

```
┌───────────────────────────────┐  ┌ WHERE TO LOOK FOR DEVICES ───────┐
│ LANGUAGE                       │  │ Razer Chroma        ●━━○ (on)     │
│ [ English ▾ ]                  │  │ Twinkly              ●━━○ (on)     │
└───────────────────────────────┘  │ Govee                ○━━● (off,     │
                                     │   Not implemented yet.  disabled) │
┌ ABOUT ────────────────────────┐  └─────────────────────────────────┘
│ A Linux replacement for Razer  │
│ Synapse.                        │
│ ⎋ Ahryman40k/synapse-copycat    │
└───────────────────────────────┘
```

**Matches**: exactly — this is the correct pattern for an unimplemented
protocol (shown, disabled, reasoned) that the per-device dialog above should
borrow rather than invent a second version of.

**Diverges — minor**: this is the _only_ place that explains what "looking
for devices" costs (a daemon call vs. a network sweep), and nothing on the
dashboard links here. A one-line link from the dashboard's empty tray state
("Check Settings — see what's being looked for") would connect the two
without duplicating the explanation.

---

## Effect studio {#studio}

```
┌───────────────────────────────────────────────────────────┐
│ Effect studio                                                │
│ Author a colour source and add it to the list. …             │
│                                                                │
│ ┌ COLOUR ONLY ───────────────────────────────────────────┐  │
│ │ An effect here decides colour and nothing else. …        │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                │
│ ┌ PREVIEW ─────────────────┐   ┌ AMBIENCE (same panel) ──┐   │
│ │ (60-column live strip)    │   │ Colour / Motion /        │   │
│ └───────────────────────────┘   │ Brightness                │   │
│                                    └───────────────────────────┘   │
│                                                                │
│ ┌ NOT YET ───────────────────────────────────────────────┐  │
│ │ What is above is a bench, not the studio. …               │  │
│ └────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

**Matches**: exactly, and it is the one page in the product framed entirely
around a future capability with no attempt to pretend otherwise — the
pattern the per-device dialog above should be copying, not a gap.

**Diverges**: none found.

---

## Where a first-open hint belongs

None of the pages above teach a first-time user what a _group_, an
_ambience_, or a _participant_ is — the product relies entirely on the
words being self-explanatory in context, which they mostly are, but "the
group is the subject, not the device" is a genuine inversion from every
competitor (Synapse, Polychromatic) that this population has used before.
A single dismissible line above the first group card, shown once
(`localStorage`-gated the same way `sources` already is), would cost one
component and no backend change:

```
│ ℹ A group is a set of devices sharing one look. Drag       ✕│
│   more onto "All devices," or start a new one below.        │
```

This is a suggestion for `frontend` to size, not a requirement — see
[usability findings](/design/usability-findings) for what is broken versus
what is merely missing.
