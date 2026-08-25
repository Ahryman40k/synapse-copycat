# Open decisions — everything waiting on the maintainer

One list, so nothing here has to be reconstructed from scattered messages.
Each entry states the facts as found, then a **non-binding recommendation**
— a recommendation is not a decision, and none of these were acted on
without one.

---

## 1. DPI staging: remove entirely, or keep as an application-owned feature?

**The facts.** No OpenRazer device exposes DPI stages on the wire — the
DBus interface has only `getDPI`/`setDPI`/`maxDPI`, a single value pair,
confirmed independently by the lead's daemon probe and by `backend` reading
`dpi.rs`. The sensitivity panel's UI offers a five-stage switchable mode
regardless.

**This is a live, unresolved disagreement between two team members, not a
settled call — recorded as such rather than picked quietly:**

- **Position A (`po`'s original call):** remove the staged-toggle/stage
  editor entirely, since no device backs it.
- **Position B (`ux`'s design, in `apps/docsite/design/dpi-staging.md`):**
  keep staging, but move its ownership from an implied device feature to
  one the application holds and applies one value at a time via plain
  `setDPI`. The evidence for this reading: `core/models/key-binding.ts`
  already declares `SensitivityAction = 'stage-up' | 'stage-down' | 'cycle'
| 'clutch'`, which only makes sense if the application holds a stage list
  and an index into it — the sensitivity panel and the assignment editor
  were designed as two halves of one feature that never got connected.
  Removing the staged toggle would leave those four assignment-editor verbs
  pointing at a concept that no longer exists anywhere in the UI, trading
  one inconsistency for another.

Ticket `0007` was split into `0007a`/`0007b` following position B, but
**nothing was ever built** — the split reflected a design direction, not a
maintainer decision, and the stand-down landed before either position was
actually implemented. Both positions are live.

**No recommendation offered here** — this is exactly the kind of
disagreement `open-decisions.md` exists to preserve rather than resolve on
one side's authority.

---

## 2. The lighting-switch-off panel (`0015`)

**The facts.** `LightingSwitchOffPanelComponent` ("switch off lighting when
the display turns off," on all three lighting sections) has an empty
component class and a checkbox with no binding at all — it doesn't even
patch local memory, let alone reach the backend. This is a different, worse
category than everything else in the per-device wiring effort: those at
least remember the choice. No capability exists anywhere in `libs/openrazer`
that could back this, and nothing in this round's scope would have added
one.

**Why this needs the maintainer and not a ticket.** Deleting a control a
user can currently see is the same tier of decision as the original
"hide the five inert pages vs. wire them for real" call — which the
maintainer already answered by choosing to build rather than hide. `po`
and `ux` independently reached the same recommendation below, which is
worth noting but doesn't settle it.

**Non-binding recommendation (`po`, `ux`):** remove it. Nothing backs it,
nothing in scope would add anything, and a checkbox with zero effect fails
the honesty bar applied to Govee and the `modules` removal this round.

**The alternative, if the maintainer prefers it**: research whether a
platform-level signal (independent of the Razer daemon — a DPMS/screen-lock
event on the Linux side) could genuinely back this, and build it as a real
feature. Materially bigger than a removal; nobody has scoped it.

---

## 3. The application identifier blocks packaging entirely (`0023`)

**The facts.** `tauri.conf.json`'s `identifier` is still the template
default, `com.tauri.dev`. `tauri build` refuses immediately — before
`frontendDist` is even read — because Tauri requires a unique identifier
per application. The desktop bundle **cannot be built at all** today,
which is why the long-unverified `frontendDist` path question (CLAUDE.md
§13.9) sat unverified for so long: nobody had gotten past this point.

**Why this needs the maintainer.** The identifier becomes the
application's permanent identity on every Linux desktop and drives config
paths — not easily changed later without affecting existing installs.

**What's needed:** a real identifier (conventionally reverse-DNS). No
recommendation offered here — this is a naming/ownership choice, not a
technical one, and nobody on the team has standing to propose the
maintainer's own namespace.

---

## 4. Copy for `getDevices()`'s three now-distinguishable states (`0004`)

**The facts.** `frontend` fixed the underlying bugs (an unhandled promise
rejection, and a worse one where a refused `watch_twinkly` call silently
killed hotplug for the whole session) without deciding what the user should
be told. Three states are now distinguishable in code but not yet worded:
the user turned Chroma discovery off in Settings; the daemon didn't answer;
the daemon answered with genuinely zero devices. A raw serial number with
no name/picture on a participant tile is the visible symptom of the middle
case today, and also occurs for any saved-group participant not yet
enumerated — whatever copy is chosen needs to read sensibly in both
situations.

**Non-binding recommendation:** `ux`'s `capability-states.md` already
solved the adjacent problem (a _control_ whose device can't do something)
with a hidden/disabled-with-reason split; the natural extension is to treat
"the whole Chroma source is unavailable" the same way, surfaced on the
existing sources-panel switch rather than invented as new UI. Exact wording
was left to whoever resumes this — `ux` and `frontend` were mid-conversation
about it when the stand-down landed.

---

## 5. The `Surface` protocol abstraction, and its sequencing with the error-shape unification (`0013`)

**The facts.** `backend`'s case for extracting a `Surface` trait (Razer and
Twinkly today; Hue, Govee later) is that the codebase now has two working
protocol implementations rather than one guessed-at, which is the precondition
the code's own comments say to wait for. Separately, `0013` (one error shape
across all eight group commands) has an agreed shape between `backend` and
`frontend`, never built. The two are related: `openrazer::BackendError`
currently doubles as the whole application's error vocabulary (a _wallpaper_
failure gets stringified into it), which both changes touch.

**Recommendation carried over from the lead:** land these together as one
change if the `Surface` extraction is authorised, not as two separate passes
over the same seam.

---

## 6. The CLI as a third channel

**The facts.** `backend` proposed adding a plain HTTP route beside the
existing MCP server on `:8730`, so a `synapse <command>` CLI gets real
replies and exit codes instead of the current single-instance/argv
forwarding (which is one-way — the second process never learns whether its
command succeeded). Explicitly **not** a proposal to change the activation
model (relaunching the binary still reveals the running instance); only to
give the existing model a transport that can answer.

**No recommendation attached** — this is a new surface area, not a
correction, and the team didn't reach a strong view either way before the
stand-down.

---

## 7. CLAUDE.md corrections

`frontend` prepared three concrete, evidence-backed diffs, not yet applied
(this document is the maintainer's, not the team's, to edit):

- **§10** currently claims "5 spec files for the whole workspace" and that
  the Rust backend "has no tests at all." Both are now false — 61 spec
  files/50 stories on the TS side, 154 Rust tests. The section currently
  tells every new agent not to trust a green run, which was good advice
  when written and is now backwards.
- **§8** describes the theming SDK as "a work in progress... sketches and
  experiments." The design it describes as aspirational is built:
  `libs/ui/src/lib/theming/` has the OKLCH tone ladder, `ThemeService`, and
  `AmbienceTheme` tying the palette to the running group's colour exactly
  as the section specifies.
- **§13.8** (the TS↔Rust `devices`/`modules` divergence) is half-resolved:
  `devices` works; `modules` doesn't exist in Rust at all (now moot —
  `0001` removed the TS caller). The entry's closing point — nothing
  verifies `BackendCommands` against Rust — is still true and worth
  keeping, cross-referenced against the generated-bindings decision (already
  resolved — both generators deleted, see `plan.md`).

Full diff text available from `frontend` on request; not duplicated here to
avoid two copies drifting apart.

---

## 8. Findings and open product questions from `ux`'s backgrounds and studio redesigns

Found while redriving both flows live against the running app, documented
in `apps/docsite/design/backgrounds-flow.md` and `studio-flow.md`. No
ticket written for any of this per the stand-down — `ux` asked explicitly
that the open questions land here rather than being picked quietly by
either of us.

**Confirmed bugs, not product questions — these have one right answer, just
never built:**

- **A wallpaper's palette, applied to a group, is announced as "Rainbow"**
  in the group card's one-line summary — the live preview is correct, only
  the text is wrong (`group-card.ts`'s summary logic predates "palette" as
  a third colour-source kind). `ux`'s own framing: "I'd push to ship this
  fix immediately regardless of anything else" — the smallest, most
  clear-cut item in this whole document.
- **The `/backgrounds` route has no resolver of its own.** A fresh load
  (bookmark, refresh, Tauri restoring the last tab) can't find any groups;
  only in-app navigation (which passes through `/dashboard`'s resolver
  first) works. Confirmed precisely — not a guess about resolver wiring.

**Real product questions, genuinely undecided:**

- **No way to tell "the wallpaper I'm browsing" from "the wallpaper
  actually lighting my group"** — same visual state serves both jobs today.
  `ux`'s redesign proposes a provenance badge to fix this, which requires
  new state: tagging a group's ambience with where it came from (e.g.
  `{kind: 'wallpaper', path}`). Nobody has committed to building it.
- **Does "Light the desk with this" (the redesign's proposed single action)
  apply the palette to every currently-running group automatically, or does
  the user pick which group(s)?** Deliberately left undecided in
  `backgrounds-flow.md` — a real product call, not an oversight.
- **Is a saved colour source (the studio redesign's core proposal — "name
  and save a palette so it becomes a fourth pickable option") a one-time
  copy onto a group, editable independently afterward, or a live reference,
  where editing the saved source updates every group using it?** Explicitly
  deferred in `studio-flow.md`.
- **Should background-extracted palettes and hand-built studio palettes
  share one saved-source library, or stay separate?** `ux`'s own proposal
  is one shared library; not yet agreed by anyone else.

**Not a gap, already resolved by the redesign itself:** the studio page's
missing "apply to a group" affordance, raised earlier in `features.md` §5,
is not an oversight — `ux`'s point is that a bare colour source (no motion,
no brightness) isn't something you'd sensibly apply directly the way
backgrounds' full ambience preview is; you'd pick it from inside a group's
own ambience panel instead, which is exactly what the "save as a source"
proposal delivers. No open question here.
