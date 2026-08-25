# Redesign: background management

Supersedes the shallow treatment this flow got in
[flows.md](/design/flows#picking-a-wallpaper-derived-palette), which
described the page rather than judging it. The maintainer's verdict — "it's
not very useful" — was correct, and this page exists to say _why_, from
actually clicking through it, not from re-reading the template more
carefully.

## The mental model, corrected

This is not a viewer or a picker for the app's own use. **The point is one
room, one look**: the user chooses a photo, the application puts it on the
desktop _and_ pulls its colours onto the hardware, so what is on the screen
and what is glowing beside it agree. Two crates do the real work —
`libs/wallpaper` (six desktop adapters, GNOME/KDE/XFCE/swww/hyprpaper/feh,
detected by `XDG_CURRENT_DESKTOP` rather than by which binaries happen to be
installed) and `libs/palette` (median-cut in OKLab, most-different-colours-
first, deliberately not a single average, which on a real photo is mud) —
and the interface's job is to make that one outcome feel like one thing,
not two independent buttons that happen to sit near each other.

**That last sentence is the whole verdict.** The current page has the right
pieces and the wrong shape: it hands the user two unconnected actions and
calls the page done at that.

## What actually happens when you drive it

Tested end to end against the real mock (`pnpm exec nx serve synapse`, own
instance on a separate port so as not to disturb the shared one) — choosing
a folder, reading it, picking a wallpaper, setting it, giving its palette to
a group, then coming back later. Three things happened that the earlier,
read-the-template pass did not catch.

### 1. The group card's summary line lies about a palette

Give "Harbour at dusk" — a blue-to-amber gradient — to the "All devices"
group. The live preview strip updates correctly (confirmed visually: a real
blue-to-amber band). The **text sentence right under it reads "Rainbow ·
Still · 100%."**

The cause is exact and small: `group-card.ts`'s `summary` computed —

```ts
colour.type === 'fixed' ? colour.rgb : 'Rainbow',
```

— was written when there were two colour kinds. A third, `palette`, arrived
later (the docsite's own words: "Palette arrived first because an image
gives you one") and this ternary was never updated to know about it, so
every non-fixed colour, including every wallpaper-derived one, is announced
as a rainbow it is not. This is a plain bug, not a design question — worth
a ticket of its own, immediately, independent of anything else on this
page. A user who just performed the entire point of this feature is told
their group is doing something else.

### 2. There is no way to tell which photo is currently lighting the room

Pick "Harbour at dusk," give it to a group. Later, browse the grid to
compare other photos — a completely ordinary thing to do, since the grid
exists to be compared — and click "Salt flat" just to look at it. Its
thumbnail gets the same highlighted border "Harbour at dusk" had. Nothing
distinguishes _the one I am currently looking at_ from _the one currently
on my hardware_, because the interface only ever had one concept —
`chosen` — for both. Coming back to this page tomorrow, there is no way to
answer "which photo is my desk showing right now" without remembering it
yourself.

This is the finding that matters most. The feature's entire premise is
"the room matches the screen," and the interface cannot currently tell the
user whether that is still true.

### 3. A direct or refreshed load of this page cannot find any groups

Loading `/backgrounds` as the _first_ navigation of a session (a bookmark,
a refresh, a Tauri window restoring its last tab) shows "No group to give
them to. Make one on the dashboard" even when groups exist. Confirmed by
isolating it: navigating here from the dashboard _inside the running app_
works correctly (`ApplicationStore.groups` is already populated); loading
this URL fresh does not, because `app.routes.ts` gives `/backgrounds` no
resolver of its own — only `/dashboard`'s route ever asks the backend for
groups, and this page just reads whatever the store happens to already
hold. A real, reachable path (not every user's _first_ navigation is
through the dashboard), and a cheap fix: give this route the same
`groupsResolver` the dashboard uses.

### What already works, and should not be rediscovered

The mock path is in good shape and should be kept exactly as it is:
`chooseFolder()` resolves immediately against a fixed mock folder (no real
dialog needed to exercise the flow), `wallpapers()` returns four sample
images with real extracted-looking palettes, and `set_wallpaper()` answers
the way the real backend would, success or refusal. The whole flow —
folder → read → pick → set → apply — is fully clickable in the browser
today, which is exactly the mock-first bar this project holds itself to.
The "what this machine has" panel's honesty about six desktop adapters and
naming which was actually found is also right as it stands; nothing below
proposes changing it.

## The redesign

### One action for the one outcome the feature promises

Today: two independent buttons, "Set as wallpaper" and "Give to «group»,"
with no relationship drawn between them. Someone who wants the point of
this page — the room matching the screen — has to know to press both,
every time, for every group they want lit this way.

**Add one primary action**: _"Light the desk with this"_ — sets the
wallpaper **and** gives the palette to every currently-running group in one
gesture. Keep the two granular actions underneath, secondary, for the two
real reasons someone would want only half: wanting the picture without the
relighting, or relighting without touching the desktop. The combined action
is the default path because it is what the feature is _for_; the split
buttons are the escape hatch, not the front door.

```
┌ HARBOUR AT DUSK ─────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  (live preview)                  │
│                                                              │
│ [ Light the desk with this ]        ← new, primary          │
│                                                              │
│   Only the wallpaper   [ Set as wallpaper ]  with swww       │
│   Only the lighting    [ Give to All devices ]                │
└──────────────────────────────────────────────────────────────┘
```

### Show which photo is currently lighting each group

The interface needs a second concept, distinct from "the one I'm looking
at": **provenance** — which group, if any, is currently running the palette
that came from this photo. This is new state, not free from what already
exists: `Ambience` carries a `ColourSource`, not where it came from, so a
group re-reads correctly but nothing traces it back to a wallpaper. The
smallest addition that answers this honestly is a provenance tag saved
alongside a group's ambience — `{ kind: 'wallpaper', path }` — set whenever
a palette is given from this page, and cleared the moment the group's
colour is changed any other way (from the ambience panel directly, from
another wallpaper, back to a fixed colour). Anything less exact — comparing
a group's current palette values back against every wallpaper's own
extracted palette to guess a match — is a fragile approximation of the same
fact and would misfire the moment two photos happen to share a dominant
hue.

```
┌────┐┌────┐┌────┐┌────┐
│img ││img ││img ││img │
│▪▪▪▪││▪▪▪▪││▪▪▪▪││▪▪▪▪│
│    ││Desk││    ││    │  ← lit-by badge, independent of which
└────┘└────┘└────┘└────┘    thumbnail is merely selected right now
```

The existing selection outline stays for "currently previewing this one" —
it is a different fact from "currently lighting something," and the fix is
to stop asking one piece of state to answer both questions, not to remove
either.

### Turn the dead end into a door

"No group to give them to. Make one on the dashboard" names the right next
step and then refuses to let the user take it from here. Make it an actual
button that opens the same new-group dialog the dashboard's does — the
dialog is already a CDK `Dialog` opened from a click handler, reachable
from anywhere, not something tied to the dashboard component. Zero new
capability, one fewer dead end.

## What this does not change

The three-part shape — a folder, the colours cut from each image, a target
to give them to — is right and stays. The decision to keep "set the
wallpaper" and "light the desk" as two _capabilities_ (someone legitimately
wants only one) is right and stays; what changes is which one is offered
first. The desktop-adapter honesty panel is right and stays untouched.

---

_Wireframes above are the proposed redesign, not the current build — see
[wireframes.md](/design/wireframes#background-manager) for the as-built
page, still accurate for everything not named as a finding here. Sent to
`po` and `frontend`._
