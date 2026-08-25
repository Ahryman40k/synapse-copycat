# Redesign: the effect studio

Supersedes the earlier, description-only pass on this page in
[flows.md](/design/flows#authoring-an-ambience). Same instruction as
[background management](/design/backgrounds-flow): drive it, then design
against what it actually needs to become, not what it currently shows.

## What a "colour source" is allowed to be, exactly

Before designing an authoring experience, checked what the model on the
other end can hold — `apps/synapse/src-tauri/src/razer/engine/ambience.rs`.
`ColourSource` is a closed, three-variant enum: `Fixed { rgb }`, `Rainbow {
turns_per_second, spread }`, `Palette { colours, turns_per_second }`.
**There is no fourth variant, and no way to hand it arbitrary logic** — no
expression, no keyframes, no plugin slot. Confirmed there is no persistence
for one either: nothing in the Rust or TypeScript trees saves a named
colour source anywhere; a group's `Ambience` holds one live value and
nothing else.

This settles the scope question the maintainer's own framing raised
("colour, not motion — read the model before designing the authoring
experience"). **An authoring tool that produces genuinely new colour math
is not buildable today without a backend change nobody has asked for.**
What _is_ buildable, entirely within the existing model, is the thing the
studio's own text already promises and nothing currently delivers: _"what
is built here becomes another choice on any group card."_

## The reframe: this is a naming and saving problem, not a colour-math one

Two of the three variants have nothing worth "authoring" — `Fixed` is one
control, `Rainbow` is two sliders, both already fully exposed in the
ambience panel every group card has. **`Palette` is the one variant with
enough shape to feel like a composition**: an ordered list of colours,
blended and wrapped, with its own drift. The background manager already
builds one of these from a photograph. The studio, today, lets someone
build one by hand — pick each swatch, add or remove one, set the drift —
using the exact same `ambience-panel` component the group cards use. **The
authoring surface already exists.** What is missing is the one verb the
page's own copy promises and never implements: **save, and give it a
name.**

That is the entire redesign: turn the studio from a bench that forgets on
navigation into the first half of a small **source library** — named
palettes (hand-built here, or lifted from a photo in the background
manager — see below) that show up as an extra option everywhere a colour
source is chosen, alongside "One colour" and "Rainbow."

## The redesign

### Name it, save it, see it in the list

```
┌ COLOUR ───────────────────────────────────────────────────┐
│ [ A palette ▾ ]   ⬛× ⬛× ⬛×  [+]     drift ──●──── 0        │
├───────────────────────────────────────────────────────────┤
│ Name this source                                            │
│ [ Sunset over the harbour            ]   [ Save as a source ]│
└───────────────────────────────────────────────────────────┘
```

Saving needs one new small thing on the backend side that does not exist
yet: somewhere to keep a short list of `{ name, source: ColourSource }`,
independent of any one group, the same shape `groups.json`-style
persistence already gives the groups themselves. Once saved, every
`ambience-panel`'s colour `Select` grows one more option per saved source,
listed after the three built-ins:

```
Colour   [ One colour ▾ ]
         [ Rainbow     ]
         [ A palette   ]
         ────────────────
         [ Sunset over the harbour ]   ← what was just saved
         [ Pine slope               ]
```

Choosing one copies its `ColourSource` value onto the group the way picking
"Rainbow" does today — a starting point the group can still tune
afterwards, not a link back to the source that stays live. (Whether it
_should_ stay live — editing "Sunset over the harbour" later and having
every group using it update together — is a real follow-on question, and
deliberately not decided here: it changes what "saving" means from "copy a
value" to "reference a shared one," which is a bigger commitment than this
redesign needs to make on a page that does not yet save anything at all.)

### One library, two authoring paths

The background manager extracts a palette from a photograph; the studio
lets someone build one by hand. **These are the same underlying thing** —
a named `Palette` — reached two different ways. Worth designing as one
library rather than two disconnected features: a wallpaper's palette,
already extracted, should be **savable into the same named-source list**
with one click from the background manager (_"Save this palette as a
source"_, next to today's "Give to «group»"), so a photo's colours become
as reusable and as findable as anything built by hand in the studio. This
also gives the studio a second, easier on-ramp for someone who has no idea
how to hand-pick a pleasing set of swatches but already has a photo they
like.

### What stays exactly as it is

The "Colour only" framing, the honesty about scope, and the preview at a
size where a wave can actually be judged are all right and none of them
change. **Nothing here proposes letting someone author motion or
brightness from this page** — that would be, in the existing docstring's
own words, "a fourth kind of thing that only works on its own," and this
redesign does not touch that boundary.

## What this deliberately does not solve

A true expression- or keyframe-based authoring tool — the thing "effect
studio" sounds like it should eventually be — is out of scope for this
pass, on purpose: it needs a fourth `ColourSource` variant, a way to
evaluate whatever gets authored safely and fast enough for a live device,
and a much larger design conversation about what such a language should
even look like. Naming that gap plainly, the same way the page's own "Not
yet" panel already does, is more honest than either building it now or
letting the smaller, real, buildable version below get lost waiting on the
bigger one.

---

_Sent to `po` and `frontend`. See [wireframes.md](/design/wireframes#studio)
for the as-built page — still accurate; everything above is additive to
it, not a correction of what it already says._
