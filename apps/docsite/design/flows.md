# User flows

Grounded in the current build (branch `10-integrate-ai`) and the Rust engine
behind it, not just the templates. Where a step's behaviour comes from a
specific file, it is named — so a flow that turns out wrong is falsifiable,
not just asserted. See [personas](/design/personas) for who each flow serves,
and [usability findings](/design/usability-findings) for what is broken in it
today.

Every flow below was walked in a real Chromium against the mock backend
(`pnpm exec nx serve synapse`) while writing this page, not inferred from
templates alone.

---

## First launch, no devices

**Who**: anyone opening the app for the first time on a machine with no
Razer hardware plugged in and, in the worst case, no OpenRazer daemon running
either.

**What happens**: `initial_conductor` (`apps/synapse/src-tauri/src/razer/state.rs`)
asks the backend for devices. If there is no backend handle, or the daemon
answers with zero devices, it returns `Conductor::default()` — **no groups at
all**, not a group with nothing in it. The dashboard then renders its two
`@empty` blocks:

```
Ambiences
  No group yet. Everything below is waiting for one.

Waiting for a group
  No Razer devices found.
```

(`dashboard-page.html`) — plus, if Twinkly discovery is on and finds nothing
either, an equally empty tray.

**The one thing on the page**: the **New group** button at the bottom. It is
reachable, it is the only primary action on an otherwise empty page, and
pressing it opens a dialog that asks for a name and nothing else
(`new-group-dialog.ts`) — deliberately, because members and an ambience are
easier to choose against a card that already exists.

**What this flow does not yet say**: _why_ there are no devices. "No Razer
devices found" is the same sentence whether the daemon is not running, the
user has no Razer hardware and never will, or a udev rule is missing. See
[No daemon running](#failure-no-daemon-running) below — today the dashboard
cannot tell these apart, because `getDevices()` in `application-store.ts`
does not catch its own failure (it is not wrapped the way `getGroups()` is).

---

## First launch, with devices

**Who**: the desk owner, day one, daemon running, at least one Razer device
plugged in.

1. `initial_conductor` finds a non-empty device list and calls
   `Conductor::with_everything` — one group, named **All devices**, holding
   every enumerated participant, **already started**, on a fixed still green
   (`DEFAULT_COLOUR`).
2. The dashboard's first paint already shows something happening — a lit
   card, a strip of green cells animating in `ambience-preview`, tiles for
   every device.
3. Nothing further is required. The design intent, stated directly in the
   Rust source, is that "an application that opens on an empty page teaches
   nothing," and that lighting the hardware unasked is deliberate and
   reversible in one click via the group's own switch.

**Divergence worth naming**: this _is_ the onboarding flow — there is no
separate first-run wizard, tour, or explanation screen. That is a legitimate
design position (show, don't narrate), but it means the only way a first-time
user learns what a "group," an "ambience," or a "participant" is, is by
opening the one card that exists and reading the disclosure. Nothing points
them at it. See the wireframe note on a **first-open hint** in
[wireframes](/design/wireframes).

---

## Discovering devices

Two entirely different mechanisms sit behind one mental action ("find my
stuff"), and the settings page's [sources panel](/design/wireframes#settings)
is the only place that says so:

| Source       | Mechanism                             | Cost                         | Default       |
| ------------ | ------------------------------------- | ---------------------------- | ------------- |
| Razer Chroma | one DBus call to the OpenRazer daemon | cheap, binary (there or not) | on            |
| Twinkly      | a sweep of the entire local subnet    | seconds, network-visible     | on            |
| Govee        | none — not implemented                | —                            | off, disabled |

- **Hot-plug** (Razer): the store subscribes to `devices_changed` at
  bootstrap (`watchForChanges()`), so plugging in a keyboard mid-session
  updates the dashboard with no reload. The new device lands in the tray,
  unassigned, until dragged into a group.
- **Network sweep** (Twinkly): `discoveredResolver` runs on the dashboard
  route and is explicitly commented as taking **seconds, not milliseconds** —
  the resolver returns the store's current (possibly empty) answer
  immediately and lets the real one land after, so the page never blocks on
  a slow subnet.
- **Toggling a source off** (`sources-panel.html`) is a standing preference,
  read from and written to `localStorage` (`readSources`/`writeSources` in
  `models/source.ts`), independent of any group — turning off Twinkly does
  not remove a Twinkly already in a group, it only stops looking for more.

**Risk**: a user on a large or untrusted network has good reason to leave
Twinkly discovery off, and the settings page correctly frames the two
switches as costing different things. But nothing on the _dashboard_ explains
why a strip they know is powered on never appeared — the fix is one click
away in Settings, and the dashboard does not point there.

---

## Creating a group

1. **New group** (bottom of dashboard, always present, primary style —
   the one call to action on a page otherwise about things that already
   exist).
2. Dialog asks for a name only, with a placeholder ("Desk") and a one-line
   hint: _"It starts empty and stopped. Drag devices onto it, then run it."_
3. `Cancel` (a real `type="button"`) or `Create` (a real form submit) — the
   distinction matters: an earlier version wired the text field's `committed`
   event to create, which also fires on blur, so clicking Cancel blurred the
   field first and created the group anyway. A story caught it; it is fixed
   now, and worth knowing about because it is the kind of bug that a
   design review — reading the interaction rather than the markup — is
   positioned to catch again.
4. The new card appears empty and stopped, at the end of the masonry grid.
   Nothing is assigned to it yet — that is the next flow.

---

## Assigning a device to a group

Two independent paths reach the same backend call
(`moveParticipant`/`setGroupMembers`), and **both must exist** — the CDK has
no keyboard equivalent for a drag, and neither does the web platform.

### By pointer

1. Drag a tile (`participant-card`, made draggable by `cdkDrag` from
   _outside_ — the card itself knows nothing about dragging) from the tray,
   or from another group's tile list, onto the target group's drop zone.
2. `cdkDropListGroup` wraps the whole board, so every list is a valid target
   for every drag with no card needing to know any other card's identity.
3. On drop, the dashboard calls `moveParticipant`; the backend enforces the
   one rule that matters — a participant belongs to at most one group — and
   the interface re-reads the truth afterward rather than trusting its own
   optimistic guess (`getGroups()`'s doc comment is explicit about this).

### Without a pointer

1. Press the small handle button on a tile (`participant-card__handle`,
   `aria-pressed` toggles) — this is "pick up."
2. Every group card that does not already hold the participant now shows a
   **Place here** button in its tile list; the tray shows a **Take «name»
   out of its group** button if the carried item came from a group.
3. Press the target's button — this is "put down," and it calls the exact
   same store method the drop handler does.
4. Pressing the same handle again puts it back down where it was picked up,
   with no side effect — the gesture is abandonable.

**Confirmed against the real build, not just the template**: this works.
What does **not** happen — confirmed by grep, not inference — is any
announcement when step 1 fires. `aria-pressed` changes on the button that
already has focus, but nothing tells a screen-reader user _where_ the new
"Place here" buttons appeared, and reaching one may mean tabbing through
every other tile in every other group first. See
[accessibility — carry has no live announcement](/design/accessibility#no-live-announcement-on-pick-up).

---

## Authoring an ambience

**Model**: three independent channels — colour, motion, brightness — that
compose rather than override (`ambience-panel.ts`). This is the flow the
whole product organises around, so it is worth walking in full.

1. Open a group's disclosure (the `<summary>` reads as a sentence — e.g.
   `#00ff00 · Still · 100%` — until pressed; a native `<details>`, so the
   toggle state, the keyboard interaction and the announced expanded state
   all come free).
2. **Colour** — choose _one colour_, _rainbow_, or _a palette_. A palette is
   a hand-built swatch row (add/remove, 1–8 colours) with its own drift
   speed; this is also what a wallpaper's extracted palette becomes when
   applied from the background manager, below.
3. **Motion** — _still_, _wave_, or _pulse_, each with its own settings
   expressed as a fraction of the device rather than an absolute distance —
   deliberately, so the same wave reads the same on a mouse mat and a
   36-key keypad rather than crossing one in a blink and the other over a
   full second.
4. **Brightness** — _one level_, or _follow the hour_ (day/night levels).
5. Every change is visible immediately in the card's `ambience-preview` — a
   composed strip, rendered in TypeScript (`composeStrip`), **not** fetched
   from any device — which is what makes it work before a daemon exists and
   before anything is plugged in.
6. Switching a channel's kind and back remembers the last tuning for that
   kind within the session (`#remembered` maps in `ambience-panel.ts`) — so
   trying _rainbow_ and returning to _one colour_ does not lose the colour
   that was set.

**What is missing on purpose, and says so**: the [Effect
studio](/design/wireframes#studio) page is explicitly a bench, not an
authoring tool — there is no way to add a fourth colour source beyond the
three built-in ones, and the page's own "Not yet" panel says why: no
expression language, and nowhere for the backend to keep one. This is the
right call over a save button that quietly forgets on restart, and the
studio page is the one place in the whole product framed entirely around a
future capability rather than a present one — worth keeping that framing
when it does get built, rather than replacing it with silence.

⚠️ **This description is superseded.** [Studio redesign](/design/studio-flow)
checks what the Rust `ColourSource` enum can actually hold before proposing
what the studio should become — a save-and-name layer over the palette
variant that already exists, not a new colour-math language — and gives a
concrete authoring flow rather than describing the current bench.

---

## Picking a wallpaper-derived palette

⚠️ **This description is superseded by [Background management
redesign](/design/backgrounds-flow)**, written after actually driving the
flow rather than reading the template — it found a mislabelling bug, a real
gap in telling which photo currently lights a group, and a route that
cannot find its groups on a direct load, and proposes a redesign around
one combined action rather than two disconnected buttons. What follows
below is kept as the as-built walkthrough; treat the linked page as current.

The background manager's own framing is exact and worth keeping verbatim:
_a folder of images, the colours cut from each of them, and a group to give
those colours to._

1. **Choose a folder** — native picker (Tauri) or nothing (browser/mock has
   no filesystem, so the mock invents a folder's worth of wallpapers in the
   shape the backend would send — see `mockWallpapers()`).
2. The page says out loud that it is decoding every image
   (`backgrounds-page__quiet`, "Reading the folder — decoding each image…") —
   deliberately, because a folder of photographs takes a visible moment and
   silence there reads as a hang.
3. Pick one image from the grid. Each thumbnail already shows its extracted
   swatches beneath it, in the order they will lay along a device — so the
   choice is made on the palette, not just the picture.
4. Two **independent** actions become available, and the page is explicit
   that they are independent: **Set as wallpaper** (drives whatever desktop
   adapter this machine has — GNOME, KDE, XFCE, `swww`/`hyprpaper`/`feh` — or
   says plainly that none was found) and **Give to «group»** (writes the
   palette as that group's colour channel, motion and drift both zeroed,
   because "this palette is about the picture" and drifting loses the
   mapping to it).
5. The same `ambience-preview` used everywhere else previews the palette as
   an ambience before either button is pressed.

**Competitive note** (see [personas](/design/personas#secondary-the-ambient-lighting-hobbyist)):
this is the same product idea as Razer Axon's _Chroma Generate_ — scan a
wallpaper, drive RGB to match. The difference worth keeping: Axon ties the
feature to Razer's own AI wallpaper generator; this page ties it to _any_
folder the user already has, which is a stronger fit for the "the desk owner
already has photos, not a subscription" persona.

---

## Failure: no daemon running

**Two different failures wearing one name**, and the codebase's own commit
history shows the interface only recently learned to tell them apart:

- **`getGroups()`** (`application-store.ts`) reads `groups` and
  `unassigned_participants` as two _independent_ `Promise.allSettled` calls,
  specifically because they used to be one `Promise.all` — on a machine with
  a light string and no Razer hardware, the unassigned-participants call
  refused for lack of a daemon, which used to take the groups answer down
  with it too, so the dashboard showed nothing and every group command
  _looked_ like it silently did nothing (each one re-reads through
  `getGroups()` afterward). Fixed: each half now fails on its own, and only
  logs a `console.warn`.
- **`getDevices()`** was **not** fixed the same way. It calls
  `backendApi.invoke('devices', {})` with no `try`/`catch` at all; a refusal
  here becomes an unhandled promise rejection, not a state update, and
  nothing on the dashboard changes to reflect it — the tray simply never
  gains anything, indistinguishable from "no hardware."

**User-visible result today**: a completely daemon-less machine looks
identical, in the interface, to a machine with a daemon and zero devices
plugged in — see [First launch, no devices](#first-launch-no-devices).
Neither state currently says "the daemon is not running; here is how to
start it," which is the single most actionable thing this failure could say
to the desk-owner persona, most of whom installed OpenRazer once and will
not remember the systemd unit's name.

---

## Failure: a device disappears mid-scene

**Two different mechanisms answer this, and they answer at different
speeds**:

- **Razer**: DBus signals push `devices_changed` immediately — unplugging a
  keyboard mid-scene removes its tile from the group (still a member in the
  saved config, just not currently answering) within the same render.
- **Twinkly**: no push channel exists over the network for this; a
  **gated poller** re-sweeps, so a strip going dark on the LAN is noticed on
  the poller's cadence, not instantly.

**What the group card shows for a member that stops answering**: not an
error. `Row.because` (`group-card.ts`) carries the backend's own reason
(`Skipped`), shown on the tile in place of the achieved-rate line — a headset
being "one colour, not a failure" and a device that "cannot afford every
tick, so it takes every fourth" are both real, named states, not generic
error text. The same reasoning surfaces again in the device dialog's
`doing` computed property, in full sentences: _"In Desk, showing one
averaged colour — measuring…"_, _"In Desk — not reporting."_

**Where this is honest and where it still isn't**: the _device_ is honest
about what it can show. The _system_ is not yet honest about _why it stopped
reporting at all_ — "not reporting" reads identically whether the device was
unplugged, the group was just started and no tick has landed yet, or (per
the finding above) the daemon itself is gone. A user watching a scene and
seeing one tile silently drop out has no way, from this text alone, to know
which of those three happened.

---

## Opening a device's own settings

1. Click a tile — in the tray or inside a group — which opens `DeviceDialog`
   over the dashboard, not a separate route. The dialog's header states, in
   one line, what the engine is making of this device right now (`doing`,
   see above) — the one thing no per-device page could say on its own,
   because it depends on the group, not the device.
2. Below that: the device's own page (mouse, keyboard, mousemat, camera, or
   strip), loaded on demand (`PAGES` map, dynamic `import()`) so none of the
   five weigh on the first bundle.
3. Tabs inside vary by kind — Customize (key rebinding), Performance
   (sensitivity, polling rate), Lighting (per-effect panels), Power
   (wireless/low-power) for a mouse; similar sets for keyboard and mousemat.

**The flow that matters more than any single control**: for every kind
except `strip`, **every control on every one of these tabs writes to
Angular component state and nothing else** — confirmed directly, not
inferred: no file under `apps/synapse/src/app/domains/devices/**` other than
`strip-page.ts` references `backendApi` or calls `invoke(...)`. A user
remaps a key, sees the new binding reflected in the list, closes the dialog,
and nothing on the hardware has changed. **The interface gives no signal that
this happened** — no banner, no disabled state, no tooltip. This is the
single highest-priority usability finding on this whole page; see
[usability findings](/design/usability-findings#per-device-controls-write-nowhere)
for the reproduction and the severity case.

The one page that is _not_ like this is `strip-page` — its switch and colour
genuinely go over the wire to the Twinkly and read back what the device
reports, which makes it the one place in the entire per-device UI that
behaves the way every tab visually promises to.

⚠️ **This section describes the build as it stands.** The five pages are
now being wired for real, which turns "does nothing" into a harder and more
interesting problem: not every Razer device supports every control, a write
can be refused or the daemon can vanish mid-write, and a device already
being painted by its group's ambience needs an answer for what its own
Lighting tab does. See [capability states](/design/capability-states) for
that design, written ahead of the wiring rather than after it.
