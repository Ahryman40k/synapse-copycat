# Usability findings

Every finding below was reproduced directly — in a real Chromium via
Playwright against `pnpm exec nx serve synapse` (mock backend, no hardware
required), or by reading the exact call sites named. Each has **what I did**,
**what happened**, **what should happen**, and a suggested severity. These
are candidate tickets for `po`; sent to `frontend` as findings on the same
pass. Accessibility-specific findings that need more than one line are in
[accessibility.md](/design/accessibility) instead — this page cross-links
them, doesn't duplicate them.

---

## Per-device controls write nowhere {#per-device-controls-write-nowhere}

**Severity: Critical — trust.**

**What I did**: opened a mouse's device dialog → Customize tab, picked a
different action for Left Click.

**What happened**: the list updates, the dialog shows the new choice, no
error, no indication of any kind. Closed the dialog, reopened it — the choice
had reverted, because nothing was ever persisted anywhere but the component's
own signal for that render.

**Why**: confirmed by grep, not inference — no file under
`apps/synapse/src/app/domains/devices/**` calls `backendApi` or `invoke(...)`
except `strip-page.ts`. Every DPI slider, macro binding, lighting-effect
panel and power setting on every Razer device tab is decoration.

**What should happen**: at minimum, visible disclosure at the point of
interaction — not a docsite paragraph nobody reading the dialog will see.
The sources panel already has the right pattern (shown, disabled or
annotated, with a reason, never hidden) — see the proposal in
[wireframes.md](/design/wireframes#device-dialog).

**Who this hits hardest**: the [Windows Synapse veteran](/design/personas#migration-the-windows-synapse-veteran)
persona, precisely because the page looks complete enough that they have no
reason to doubt it.

---

## The Modules tile throws an uncaught RuntimeError {#module-tile-throws-a-runtime-error}

**Severity: High — broken, not just unfinished.**

**What I did**: clicked the "Twinkly" tile under the dashboard's Modules
section (also reachable identically from the appbar).

**What happened**: `RuntimeError: NG04002: Cannot match any routes. URL
Segment: 'module/twinkly'`, thrown from Angular's router, uncaught. The URL
does not change (still `/dashboard`), so there is no visible symptom in the
UI — the only evidence is the browser console. Reproduction:

```
$ pnpm exec nx serve synapse
# in a browser: click "Twinkly" under Modules, or in the app bar
# devtools console:
ERROR RuntimeError: NG04002: Cannot match any routes. URL Segment: 'module/twinkly'
```

**Why**: `app.routes.ts` declares no `module/:kind` route at all.
`Navigation`'s own `#go` helper anticipates _some_ form of this failure — it
checks whether `router.navigate` resolved to `false` and logs a `console.warn`
in that case — but an entirely unmatched segment does not resolve to `false`,
it rejects, so that guard never runs and the rejection surfaces as an
uncaught error instead.

**What should happen**: either the route exists (a module landing page), or
the tile does not render as a clickable button pointed at a route that does
not exist. If a module page is genuinely not designed yet, the tile should
say so the way every other "not yet" surface in this product does, rather
than throwing.

---

## `getDevices()` has no error handling {#getdevices-has-no-error-handling}

**Severity: High — makes a real failure indistinguishable from a normal
empty state.**

**What I did**: read `getDevices()` in `application-store.ts` and traced
what happens if `backendApi.invoke('devices', {})` rejects (no daemon
running, or the daemon call itself fails for any reason).

**What happened**: the call is not wrapped in a `try`/`catch`, unlike
`getGroups()` a few hundred lines below it, which explicitly documents having
been fixed for exactly this class of bug (`Promise.allSettled` instead of
`Promise.all`, so one refusal cannot bury the other's answer). A rejection
here becomes an unhandled promise rejection; `wired` in the store is never
patched; the dashboard shows the same "No Razer devices found" it would show
on a daemon that is running and genuinely has nothing plugged in.

**What should happen**: the same treatment `getGroups()` already received —
catch the rejection, log it, and let the interface say something different
for "the daemon itself could not be reached" versus "the daemon answered:
nothing here." See [flows.md](/design/flows#failure-no-daemon-running) for
the user-facing wording this unblocks.

---

## Twinkly artwork is illegible on dark cards {#twinkly-artwork-is-illegible-on-dark-cards}

**Severity: Medium — visual, affects every Twinkly-owning user on every
screen that shows the module or the strip's own tile.**

**What I did**: looked at the Twinkly participant tile and the Twinkly
module tile in a real render (both use `assets/modules/twinkly.png`).

**What happened**: the artwork is dark, cursive brand wordmark on a
transparent background; placed on this product's dark theme, both tiles
render as a near-black rectangle. The name is present as real text
underneath the image (so it is not _inaccessible_), but the artwork itself —
the thing that should make a Twinkly tile instantly recognisable at a
glance, the way the mouse and keyboard tiles are — communicates nothing.

**What should happen**: a light or theme-aware variant of the wordmark, or a
plain glyph consistent with the fallback proposed below.

---

## No fallback artwork for a device with none

**Severity: Low — already degrades gracefully by the product's own
standard, but the standard itself is incomplete.**

**What I did**: checked which mock devices render with no picture:
`Razer Tartarus V2` (keypad), `Razer Kraken Ultimate` (headset), `Razer Base
Station Chroma` (accessory/dock). Confirmed each fires a real 404 against
`assets/devices/<vendor>-<product>.png` (`5426-0555.png`, `5426-1319.png`,
`5426-3848.png`) that the card's `[image]` binding silently swallows rather
than showing a broken-image icon — the intended behaviour, per the comment
in `application-store.ts`.

**What happened**: "gracefully degrades to no broken image" produces a
blank card with only a name — visually indistinguishable from a card that
failed to load a picture it _should_ have had, versus a device kind this
product has never claimed to picture.

**What should happen**: a small per-kind glyph (keyboard / mouse / mousemat
/ headset / accessory / strip — six values, already known at
`Device['kind']`) as the fallback, so a card with no photograph still reads
as _a keypad, unpictured_ rather than _nothing_. Low cost: one SVG per kind,
already-known discriminant.

---

## The new-group dialog has no visible backdrop

**Severity: Low — functional, not broken; a clarity nit.**

**What I did**: opened the New group dialog and looked at the dashboard
behind it.

**What happened**: the page behind the dialog stays at full brightness —
there is no scrim/backdrop darkening it, even though the CDK dialog
correctly traps focus and Escape correctly closes it. Functionally this is a
modal; visually, at a glance, it could be mistaken for an inline panel.

**What should happen**: a light backdrop, using the theming SDK's existing
tokens. See the wireframe note in
[wireframes.md](/design/wireframes#new-group-dialog).

---

## Console noise on first paint

**Severity: Low — developer-facing, but worth clearing before this reaches
a demo.**

**What I did**: watched the browser console on a cold load of the
dashboard.

**What happened**: three 404s (the missing device artwork above) and one
Angular `NG0913` warning — a device image (`5426-3074.png`, the Goliathus
mouse mat) has intrinsic dimensions much larger than its rendered size,
which Angular's image directive flags as a loading-performance smell.

**What should happen**: pre-sized/optimised device artwork would clear the
`NG0913` warning; the fallback-glyph fix above clears the 404s as a side
effect, since a kind with no real asset would never request one.

---

## A circadian ambience can never be previewed at night {#circadian-preview-is-pinned-to-noon}

**Severity: Low — a real gap, cheap to close, found while answering `po`'s
question about the unused Rust `preview()` capability.**

**What I did**: set a group's brightness channel to "Follow the hour" with
visibly different day and night levels, then looked for a way to see the
night level in the preview without waiting for night.

**What happened**: there is no such way, on either side of the stack.
`ambience-preview`'s `at()` helper (`libs/backend-api/src/lib/models/compose.ts`)
hardcodes `dayFraction: 0.5` — noon — specifically "so a preview is not
dimmed by circadian unless asked," which is a deliberate choice, but nothing
ever _does_ ask: no control anywhere sets a different fraction. The Rust
`preview()` function backend built (`razer/engine/runner.rs`) is no better
for this specific case — it reads the real `SystemTime::now()`, not an
arbitrary chosen time of day, so it is exactly as unable to show "night" on
demand as the frontend is.

**What should happen**: this does not need the Rust capability at all — the
TS `Tick` already carries `dayFraction` as a plain field. The cheapest fix
is entirely client-side: let `ambience-preview` accept an optional
day-fraction override (a small scrubber, or even just "Day"/"Night" preset
buttons next to a circadian brightness control), defaulting to today's
noon-pinned behaviour when absent. See the reply to `po`'s
`preview_ambience` question for why the backend capability itself is a
separate, larger decision from this specific gap.

---

## Findings that are accessibility-specific

See [accessibility.md](/design/accessibility) for:

- no live announcement when a participant is picked up via the keyboard path
  (the "Place here" button appears somewhere else in the DOM with nothing
  telling a screen-reader user it now exists, or where),
- the drag handle's touch/click target size, and
- the live ambience preview's static `aria-label`.
