# Accessibility audit

Scoped to the brief: audit the keyboard equivalent for dragging first, since
the CDK provides none and neither does the platform — every drag in this
product must be doubled by something reachable without a pointer, and this
page checks whether that promise actually holds. A shorter pass over what
else is already right, and what else is not, follows.

Checked directly — keyboard-only navigation and a screen-reader-relevant DOM
read, via Playwright against the real render, not read off the templates
alone.

---

## The drag equivalent itself: present and functionally correct

**What exists**: every draggable tile (`participant-card`) carries a
handle button, separate from the tile's own open action (confirmed as
siblings in the DOM, not nested — a button inside a button would be invalid
markup, and the component comments say this was deliberate). Pressing it
toggles a "carried" state (`aria-pressed`); every valid drop target then
grows an extra button — **Place here** on a group that does not already
hold the item, **Take «name» out of its group** in the tray if the item came
from a group. Pressing that button calls the exact same store method the
pointer drop handler calls. Pressing the original handle again cancels the
pick-up with no side effect.

This is the right shape: a genuine second path to the same operation, not a
degraded one, and abandonable at either end. It is also **fully present in
the running build**, not just in the template — confirmed by driving it with
Playwright's keyboard/click APIs against the mock backend.

## Where it breaks down: the gap between "reachable" and "usable" {#no-live-announcement-on-pick-up}

**Severity: High.** The mechanism works; finding it does not, once more than
one group exists.

**What I did**: focused a tile's handle and activated it (the keyboard path
for pick-up).

**What happened**: nothing is announced. `aria-pressed` changes on the
button that already has focus — a screen reader may or may not re-announce
that on its own depending on the reader and verbosity settings — but nothing
tells the user _what just became possible_: a **Place here** button now
exists on every other group card, and a **Take out** button now exists in
the tray, both elsewhere in the DOM. Confirmed by grep across
`dashboard-page`, `group-card` and `participant-card`: the only `aria-live`
region or `role="status"` anywhere in this part of the tree is the refusal
message at the top of the dashboard (`dashboard-page__problem`), which has
nothing to do with carrying.

**Why this matters more as the product succeeds**: with one group (the
default, first-run state) the next stop after the handle is the tray's
**Take out** button, one tab-stop away — barely noticeable. The moment a
second or third group exists — which is the entire point of the product —
reaching the **Place here** button on a group three cards down means tabbing
through every tile in every intervening card first, with no landmark, no
skip link, and no announcement that anything is even in a "carrying" state
if the user tabbed away and back.

**What should happen**: an `aria-live="polite"` region — the same
mechanism already used for the group-refusal message, so this is a pattern
extension, not a new one — announcing something like _"Razer Basilisk
Ultimate Receiver picked up. Tab to a group's Place button to move it
there, or press the handle again to put it back."_ This does not require
solving general drag accessibility; it requires saying, once, what the
button that was just pressed did.

## Target size

**Severity: Medium.** The handle button is styled at `1.25rem × 1.25rem`
(`participant-card.scss`) — **20×20 CSS px**. WCAG 2.2's Target Size
(Minimum) criterion (2.5.8, Level AA) asks for at least 24×24 CSS px, with
narrow exceptions this control does not qualify for (it is not inline text,
and there is no equivalent same-size control already meeting the minimum
next to it). It sits in a corner of an already-small tile
(`participant-card` is deliberately tighter than a standalone card, per its
own stylesheet comment, because several sit side by side in a group), which
makes the shortfall worse in practice than the 4px gap suggests — this is
the _only_ way to move a device without a pointer, on the smallest
clickable target in the entire dashboard.

**What should happen**: grow the hit area (padding on the button, not
necessarily the visible glyph) to 24×24 minimum without changing the tile's
visual density — a transparent hit-area larger than the drawn icon is the
usual fix and costs no layout change.

## The live ambience preview and screen readers

**Severity: Low — not a bug, but worth stating rather than assuming.**
`ambience-preview` is `role="img"` with a **static** `aria-label` — the
group card passes `group().name + ' preview'` (e.g. "Desk preview"), which
never changes as the ambience does. A screen reader user gets no equivalent
of the moving colour strip a sighted user sees. This is arguably fine
_because_ the same information already exists as real, readable text one
line below it — the disclosure's summary sentence (`#00ff00 · Still · 100%`)
— so nothing is actually lost, but it is worth confirming deliberately
rather than assuming: if that summary line is ever removed or restyled away
from being real text, the preview would need to start carrying the
information itself.

## What is already right, and worth not disturbing

- **Dialogs**: the CDK's `Dialog`/`DialogRef` pattern, correctly not
  double-declaring `role="dialog"` on the dialog's own root (the CDK
  container already carries it) — the component comments in both
  `new-group-dialog.ts` and `device-dialog.ts` show this was a deliberate,
  documented fix rather than an accident, and it holds up under inspection.
- **Rename-in-place focus management**: `group-card.ts` schedules the
  caret's focus with `afterNextRender`, specifically because doing it
  synchronously or in an `effect` ran before the view refreshed and the
  field being focused did not exist yet. Confirmed working.
- **`prefers-reduced-motion`**: `ambience-preview` checks it and freezes on
  a still frame rather than animating regardless.
- **The overflow menu positioning**: the appbar's clipped region and the
  separately-positioned overflow menu avoid the classic `overflow: hidden`
  trap where a popover is in the DOM and invisible.
- **WCAG 2.5.3 (Label in Name)**: the appbar's module buttons use `title`
  for the full name and never override the visible label with a
  conflicting `aria-label` — correctly reasoned in the component's own
  comment.

None of the above needs a finding filed against it. Listed so a future pass
does not spend time re-verifying what this one already did.

## Not yet audited

Time-boxed to the areas above. Not covered in this pass, and worth a
follow-up: keyboard/screen-reader behaviour of `libs/ui`'s `Select`,
`SliderComponent` and `ColorPicker` inside the ambience panel (all
third-tier custom controls, which is exactly where ARIA patterns most often
drift from native semantics), and the key-capture control in
`assignment-editor` — moot in practice today since that whole page is
unwired (see [usability findings](/design/usability-findings#per-device-controls-write-nowhere)),
but worth revisiting the moment it is.
