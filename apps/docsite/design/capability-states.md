# Per-device controls: what a control does when the device can't

Written before the first per-device control is wired, per the team's
request — retrofitting this across four device kinds afterwards is the
expensive path. Answers the four questions the brief raised, in order, then
gives the copy `po` asked for on a related, smaller decision.

**Grounded in what the backend already distinguishes**, not invented from
scratch: `BackendError` (`libs/openrazer/src/backend/mod.rs`) already has
five variants, and they map almost exactly onto the design problem below —
this page's job is mostly to decide what each one _looks like_, not to
invent a new taxonomy.

```rust
DaemonUnavailable(String)   // no connection ever existed
InterfaceUnsupported(String) // this device does not have this capability
DeviceNotFound(String)      // this one did, and currently doesn't answer
Transport(String)           // a live connection just failed
Protocol(String)            // it answered, and not sensibly
```

The comment on `DaemonUnavailable` already states the design intent this
whole page is arguing for: _"the frontend should say so rather than show an
empty device list."_ Good — that principle just needs to be applied
consistently everywhere a capability can be missing, not only at the top of
the device list.

---

## The one distinction that resolves three of the four questions

**Structural absence and transient absence are different things, and should
look different.**

- **Structural** — `InterfaceUnsupported`. _This device_ does not answer to
  this method, full stop, on every visit. Known (or knowable) the moment
  the dialog opens, before any control renders.
  ⚠️ **Per device instance, at method granularity — never per kind or
  model.** Confirmed directly against the running daemon: `getPollRate` and
  `setPollRate` exist on one mouse and are absent on another, although both
  expose the same `razer.device.misc` interface — so "this is a mouse,
  therefore polling rate" is false, and even "this device exposes
  `razer.device.misc`, therefore polling rate" is false. A table keyed by
  `Device['kind']`, or by vendor/product id, is the shortcut an implementer
  reaches for to avoid a discovery round trip, and it is exactly what would
  produce a control that works on one person's mouse and errors on the
  next person's otherwise-identical-looking one. The only source of truth
  is whatever `backend`'s capability discovery answers for _that serial_,
  every time.
- **Transient** — `DaemonUnavailable`, `DeviceNotFound`, `Transport`. This
  control applies to this device, and right now cannot be reached — the
  daemon fell over, the device unplugged mid-session, a write timed out.
  Not known until something is attempted, and not permanent.

Conflating them is exactly how a page becomes a wall of grey: if "no DPI
stages" and "DPI momentarily unreachable" render identically, a user has no
way to learn which of their controls will ever work versus which just need
a retry — and a device with two working controls out of six ends up
looking like four things are broken rather than two things that were never
there.

**Rule: structural absence is omitted. Transient absence is shown,
disabled, with a reason.**

## 1. Hidden, or disabled with a reason?

**Both — one per kind of absence, not a single answer for all of them.**

- **Structural** (`InterfaceUnsupported`): omit the control entirely. Not
  greyed, not present-with-a-tooltip — gone, the way the `accessory` device
  kind already gets no page at all (`device-dialog.ts`'s `PAGES` map has no
  entry for it, and the dialog shows only the summary line). This is that
  same precedent, applied one level down: instead of "no page for this
  kind," it becomes "no _Performance tab_ for this kind," or "no _DPI row_
  in this tab."
- **Transient** (everything else): disabled, with a stated reason, visible
  — the sources panel's Govee switch, generalised. _"Left click — could not
  reach the device. Reconnect it, or check the daemon."_ is the same shape
  as _"Govee — Not implemented yet,"_ just carrying a different reason.

This is not a new pattern to design. It is the one pattern the product
already uses twice (`sources-panel`, the accessory device kind), applied
consistently to the boundary in between them.

## 2. What does a page look like at two working controls out of six?

**The tab bar changes shape; a present tab does not fill with grey.**

Capability discovery has to run **once, on dialog open**, before any tab
renders — not lazily per click, which is what would produce controls
popping in and out of "supported" as each independently fails on first
use. Concretely:

- A tab with **zero** applicable controls (every control on it is
  structurally absent) **does not appear in the tab bar at all** — the
  device dialog already has a table (`PAGES`) deciding which kinds get
  which tabs; this is the same idea, run per-tab-within-a-kind rather than
  per-kind. A mouse with no macro engine simply has no Customize tab, the
  same way a Base Station Chroma has no tabs at all today.
- A tab with **some** applicable controls shows only those — the
  structurally-absent ones are omitted from that tab's layout, not shown
  disabled. A Performance tab for a device with sensitivity stages but no
  polling-rate setting shows the sensitivity panel and nothing where the
  polling-rate panel would have been — not a greyed-out polling-rate panel
  sitting there for no reason.
- **A tab that would end up completely empty after that filtering is
  itself the "does not appear" case above** — there is no state where a
  tab renders with nothing in it.

The result: a device with two working controls out of six gets a device
dialog with fewer tabs and shorter tabs, never a full-looking page half
greyed out. The shape shrinks to fit what is real, rather than staying
fixed and fading what isn't.

**Update: this is already built, not just proposed.** The upfront version
this design assumed is exactly what `libs/openrazer/src/request.rs`
implements — `CATALOGUE` names every capability's required DBus methods,
and `supported_from(methods)` filters it against one device's own
introspection to return the list of what that specific device answers to,
per method, in one pass. That is the single upfront query per device this
page argued for, already in the tree, with the comment on `CATALOGUE`
independently making the same discovery-per-method argument this page
does: _"not every device can do every capability, and the difference is
finer than the device's kind."_ Nothing further needed from `backend` on
this specific question — the frontend has a real list to render tabs from
once it calls it.

## 3. In flight, refused, or the daemon vanishing mid-write

Three separate moments, and the existing Twinkly colour picker
(`application-store.ts`, the `_stripWrites` queue and `LatestWins`) is
already the right model for the first one — extend it, don't replace it.

- **In flight**: update optimistically in the component immediately (the
  slider moves, the toggle flips) — the same choice already made for the
  Twinkly picker, which fires continuously while dragging and would be
  unusable waiting on a round trip per pixel. Show a pending affordance
  **only past a short delay** (e.g. 300–500ms) rather than on every
  keystroke, so a fast, healthy round trip never flickers a spinner nobody
  needed to see.
- **Refused** (`Protocol`, or a capability-specific rejection — a DPI value
  outside the device's own range, say): revert the control to its last
  confirmed value and show the reason **inline, next to the control**, not
  as a toast that can be missed and is gone by the time the reader looks
  up. This matches the dashboard's existing `problem` signal pattern
  (`role="status"`, stays until the next success) — same mechanism, scoped
  to the control instead of the whole dashboard.
- **The daemon vanishes mid-write** (`Transport`, or a subsequent
  `DaemonUnavailable`): do not treat this as a failure of the one control
  that happened to be mid-write. Every other live control on that device is
  about to fail the same way. Flip the **whole tab** into the transient-
  unavailable disabled state from §1, with one shared reason ("Lost the
  daemon while writing — reconnect and reopen this device"), rather than
  letting five controls independently discover the same fact and show five
  separate, slightly different error strings.

## 4. Per-device lighting vs. the group's ambience

**Scope this to exactly one tab.** DPI, macros, polling rate, power modes —
none of that overlaps with what a group's ambience decides. Only
**Lighting** does, because the ambience engine and a per-device lighting
control would both be writing colour to the same LEDs.

**The rule, stated once so it can be applied identically on every device
kind's Lighting tab**:

> A device that belongs to a group — running _or stopped_ — has its
> Lighting tab disabled, with a reason naming the group and a way to reach
> it. A device in the tray (no group at all) has a fully live Lighting tab.

**Why stopped counts too, and this is the detail worth getting right**: a
stopped group still owns the device's lighting the moment it is started
again — its ambience will repaint over whatever the per-device tab set,
with no warning, which is exactly the "control accepted input and silently
changed nothing that survives" failure this whole page exists to prevent.
Treating "stopped" as "free to use the per-device tab" would just relocate
the trust problem instead of fixing it.

```
┌ LIGHTING ──────────────────────────────────────────────┐
│ ⚠ In "Desk" — this device's lighting is set by the      │
│   group, not here.  [ Open Desk's ambience ]            │
└──────────────────────────────────────────────────────────┘
```

— same disabled-with-reason shape as everywhere else on this page, and the
button is a real escape hatch rather than a dead end: it takes the user to
the one place that _does_ currently control this device's lighting, which
is the group card's own disclosure.

A device with no group has nothing arbitrating this, so its Lighting tab
behaves exactly like Customize/Performance/Power already will — live,
subject only to §1–3 above.

---

## Copy for the no-daemon-vs-zero-devices ticket (`0004`)

Not part of the four questions above, but `po` asked for this directly and
it uses the same backend error taxonomy, so it belongs here rather than in
a separate note. **There are three states today, not two** — worth folding
the third into the same ticket rather than fixing it partially:

| State              | Cause                                                                                                                                                           | Copy                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Turned off         | `sources().chroma` is `false` — the user's own choice in Settings                                                                                               | _"Not looking for Razer devices — turned off in Settings."_                                                                                    |
| Daemon unreachable | `getDevices()`'s call rejects with `DaemonUnavailable` (today: uncaught, see [usability findings](/design/usability-findings#getdevices-has-no-error-handling)) | _"Could not reach the OpenRazer daemon. Check that it is installed and running."_                                                              |
| Genuinely none     | The call resolves with an empty list                                                                                                                            | _"No Razer devices found. Looking: Razer Chroma, Twinkly."_ (today's copy — accurate for this case specifically, misleading for the other two) |

The first row costs nothing new — `sources()` is already read on the
settings page and just needs checking before the empty-tray message
renders. The second needs the `getDevices()` fix from the usability
findings to have anywhere to put `DaemonUnavailable`'s own message once the
Rust side is already naming it precisely.

---

_Sent to `po` and `frontend` before the first control is wired, per the
team's request — see [flows.md](/design/flows#opening-a-devices-own-settings)
for how this slots into the existing per-device-dialog flow._
