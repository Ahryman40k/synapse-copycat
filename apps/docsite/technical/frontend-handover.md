# Frontend handover

Everything the TypeScript side gained in this round, everything it did not, and
the measurements behind both. Written at the point of standing down, so it is a
handover rather than a progress report.

**Nothing here is committed.** Every file listed is sitting modified or new in
the working tree for review. Section 1 is ordered to be read alongside
`git diff`.

Verified at the point of writing:

| Check                                | Result                                       |
| ------------------------------------ | -------------------------------------------- |
| `nx run-many -t lint test typecheck` | green, 5 projects                            |
| Vitest                               | 61 spec files, 515 tests                     |
| `nx run synapse:test-storybook`      | 50 suites, 171 play tests, in real Chromium  |
| `nx build synapse`                   | green, **495.83 kB** initial (budget 500 kB) |
| `pnpm format:check`                  | clean                                        |

---

## 1. What changed, file by file

### New files

#### `libs/backend-api/src/lib/models/validate.ts`

The two helpers every backend read now goes through: `parsedValue` for a single
answer, `parsedList` for a list. Neither throws; both warn. See §2 for why.

#### `libs/backend-api/src/lib/models/validate.spec.ts`

Seven tests over those helpers. They exist because the _degrading_ is the design
— "shows less, says so" is a decision that should break a test if someone
quietly turns it into "shows nothing" or "throws".

#### `libs/backend-api/src/lib/models/twinkly.ts`

`WireTwinklyDevice` — the valibot mirror of `discovery::TwinklyDevice`. Its own
file rather than a corner of `device.ts`, because a Twinkly is the first
participant that arrives over UDP rather than DBus.

#### `apps/synapse/src/app/app.config.spec.ts`

**The most load-bearing test added this round.** It runs the application's own
browser mock through the application's own validators and asserts that
**nothing was warned about**. `Mock` is derived from `BackendCommands`, so a
wrongly-shaped mock _should_ be a compile error — but Vitest transpiles via
esbuild without typechecking, so a broken mock compiles, runs and passes green.
Now that every answer is parsed, a drifted mock would not fail loudly either: it
would quietly show fewer devices than it declares, in the one mode the whole
interface is developed in. This is the mechanical guard against that.

### Deleted files

#### `libs/backend-api/src/lib/generated/` — 3 files, 677 lines

`tauri-typegen` output. Deleted by maintainer decision; see §5.

#### `libs/backend-api/src/lib/models/module.ts`

The `Module` domain type and `WireModule`. Went with the `modules` feature.

### The contract — `libs/backend-api/src/lib/models/`

#### `device.ts`

Added `WireDevice` and `WireDeviceKind`.

⚠️ `WireDeviceKind` is **seven** values, not the domain type's eight and not
Rust's six, and the asymmetry is deliberate. `strip` is excluded: it is invented
by the store from a `twinkly_devices` answer, so nothing on the `devices` wire
can legitimately say it. `streaming` is included even though
`razer::device::DeviceKind` cannot emit it — the contract declares it for a
Kiyo, and the browser mock produces it so the camera page can be built at all.
Narrowing to Rust's six would have been more faithful to today's daemon and
would have silently dropped the Kiyo out of every mock, which is the failure a
validator should prevent rather than cause.

#### `wallpaper.ts`

Added `WallpaperSetter`.

#### `backend-commands.ts`

`devices.returnType.kind` now points at `WireDeviceKind`; `modules`,
`twinkly_devices` and `wallpaper_setters` now point at the schemas rather than
restating their shapes inline. The `modules` entry was then removed entirely.

#### `index.ts`, `mock-defaults.ts`

Exports for the new files; `modules` dropped from `unusedCommands()`.

### The stores — `apps/synapse/src/app/core/stores/`

#### `application-store.ts`

- Validation at five commands and both hotplug events (§2).
- `toDevices` / `toStrips` added as the single parse-then-map door each, so the
  fetch path and the event path cannot disagree about whether validation
  happened.
- Both `TODO: write wrapper here + validator` comments removed, satisfied.
- `modules` state, `getModules`, and the `Module` import removed.
- **Three no-daemon fixes** (§5, ticket 0004).

#### `wallpapers-store.ts`

Validation at all four of its reads. `setters` is now typed `WallpaperSetter[]`
rather than a restated inline shape.

### Routing and navigation

#### `app.routes.ts`

`modulesResolver` and its route entry removed.

#### `core/navigation/navigation.ts`

`AppLocation` loses its `{ on: 'module' }` arm; `activeId`, `openModule` and the
private `#go` warning helper are gone. `place` is now simply
`this.location().on` — it could never be `undefined` again once modules left.

### Components

#### `appbar/appbar.ts`, `.html`, `.scss`, `_appbar.theme.scss`, `.mdx`

The module entries, the `⋯` overflow menu, its `IntersectionObserver`,
`labelByKind`, and the styles and theme rules for the menu. See §5 for what this
cost. `ariaLabel` default changed from `'Modules'` to `'Places'`. The `.mdx`
keeps the overflow design rationale as explicit history rather than deleting it.

#### `core/layout/default-layout/*`

No longer injects `ApplicationStore` at all — the shell reads no store now.

#### `domains/dashboard-page/*`

The Modules section, `openModule`, the `Navigation` injection, the
`.dashboard-page__modules` grid, and the now-unused `Card` import (which was
raising `NG8113` on the production build).

#### `models/config.ts`

Unused `literal` and `union` imports removed.

### Build and tooling

#### `apps/synapse/project.json`, `libs/backend-api/project.json`, `libs/ui/project.json`

**A `typecheck` target**, which the repo did not have. `nx run-many -t typecheck`
runs `tsc --noEmit` over the app config, and over the **lib and spec configs** of
both libraries. 3.6s, cached. Verified to actually fail by planting a type error
rather than assuming.

⚠️ The lib config is the one that mattered: nothing ran it, which is exactly why
677 lines of uncompilable generated bindings sat in the tree unnoticed. With the
generators now removed, nothing mechanically checks the TS contract against
Rust, so this target matters more than when it was proposed. It belongs in CI.

#### `apps/synapse/.storybook/main.ts`

`staticDirs: ['..', '../src']` → `['../public', '../src']`. See §5 — this is not
mine, but it broke the only browser-based suite and is one line.

### Specs and stories touched only to drop `modules`

`app.spec.ts`, `dashboard-page.spec.ts` / `.stories.ts`,
`default-layout.spec.ts` / `.stories.ts`, `settings-page.spec.ts` /
`.stories.ts`, `camera-page.spec.ts` / `.stories.ts`, `keyboard-page.spec.ts` /
`.stories.ts`, `mouse-page.stories.ts`, `mousemat-page.stories.ts`,
`backend-api.spec.ts`, `navigation.spec.ts`, `appbar.spec.ts` / `.stories.ts`.

---

## 2. The validators

CLAUDE.md §6 calls runtime validation the project's core principle and
non-negotiable. It was not being done for backend responses.

### Eleven call sites, not nine

The nine commands are `devices`, `modules` (since removed),
`twinkly_devices`, `groups`, `unassigned_participants`, `wallpapers`,
`wallpaper_setters`, `set_wallpaper` and `choose_wallpaper_folder`.

The other two are the `devices_changed` and `twinkly_devices_changed` **events**.
`BackendEvents` declares each payload as exactly what the matching command
answers — the same wire shape arriving through a second door. A validator on the
fetch with the event left open is theatre: hotplug would be the way a malformed
device got in. Hence `toDevices` and `toStrips`, one function each, used by both
paths.

### Two schemas already existed and were never run

`GroupStatus` (`group.ts`) and `Wallpaper` (`wallpaper.ts`) were complete valibot
schemas that every call site imported as `import type` only. Every group reached
the dashboard on the strength of its static type alone.

Before switching `GroupStatus` on, its whole graph was checked against the Rust
serde representation rather than assumed — `Group`, `DeviceStatus`, `Skipped`,
`Achieved`, `Cadence` and the full `Ambience` tree. It matches. A Rust test in
`engine/ambience.rs` pins the exact JSON string, which is what made that
checkable.

### Drop the record, keep the rest, warn — and never throw

**Never throw**, because nobody awaits these calls. `devicesResolver` invokes
`store.getDevices()` and returns what the store already holds; a rejection there
is an unhandled promise, not something a user ever sees. So a bad answer degrades
to "nothing found", which every screen already knows how to show.

**Per record, not all-or-nothing.** One unreadable device must not cost the
reader the other five. The backend already works this way —
`commands.rs::enumerate` logs the peripherals it could not read and answers with
the rest — and an interface that threw the lot away on one bad record would be
stricter than the thing it is reading.

**Never silently.** Every drop is counted and named:
`dropped 1 of 8 from devices — kind: Invalid type`. Dropping without a word is
how a contract drifts for weeks while the interface looks like it is working.

An answer that is not a list at all gets its own wording — that is the contract
being wrong, not one record being odd.

### One consequence worth knowing

⚠️ **An image whose palette came back empty now disappears from the backgrounds
grid.** `Wallpaper.palette` is `minLength(1)` — "an image with no colour in it is
not an image" — and Rust's `palette::extract(path, …).unwrap_or_default()` really
can answer with none for a picture it failed to cut. So a file that is in the
folder can be missing from the page, with only a console warning to say so.

The rule was kept and the behaviour pinned in a test rather than the schema
quietly weakened, but it is a product call and it has not been made.

### It also caught a real divergence

`GroupStatus` parsing rejects `cadence: 'Slow'` — which is exactly what
`tauri-typegen` emitted, against the `#[serde(rename_all = "lowercase")]` the
Rust enum actually carries. That is now a passing test, and it was the strongest
single argument in the generated-bindings decision.

---

## 3. The bundle, in full

The initial bundle is measured against a 500 kB warning budget (error at 1 MB).
It had **1.7 kB of headroom** at the start of the round.

| State                                             | Initial total | Note                     |
| ------------------------------------------------- | ------------- | ------------------------ |
| Baseline, start of round                          | 498.30 kB     | 1.7 kB under             |
| After the validators                              | **502.00 kB** | **over budget, warned**  |
| Reclaim attempt — mock fixtures lazily imported   | 501.10 kB     | **worse than baseline**  |
| Reclaim attempt — mock fixtures in their own file | 502.04 kB     | **worse still**          |
| After the `modules` deletion                      | **495.83 kB** | 4.2 kB under, no warning |

### Validation costs 3.7 kB, and it is not waste

Turning on `GroupStatus` validation links the whole ambience and group schema
graph into the initial bundle, where it was previously tree-shaken out because
every reference was `import type`. That is inherent to actually validating.

### ⚠️ The obvious reclaim is a net regression — do not re-attempt it

`app.config.ts` statically imports the browser mock fixtures — six device
literals plus `mockGroups`, `mockTwinkly` and `mockWallpapers` — so they ship
inside `main.js` in the **desktop** bundle too, where `isTauri()` is always true
and none of it can run. This looks like obvious low-hanging fruit in the bundle
report. It is not.

Moving them into a lazily `import()`ed module was built and measured:
**498.30 → 501.10 kB**. The fixtures are only about 1 kB, and splitting them out
of `main.js` costs roughly 3 kB in lost inlining and cross-module minification,
because they had been minified together with their only caller. A variant that
kept them in a separate file but imported it statically measured 502.04 kB —
worse again. The async-vs-promise-chain style of `main.ts` made no difference;
the target is ES2022, so `async`/`await` is native and costs nothing.

Both attempts were reverted. `main.ts` and `app.config.ts` are back to their
original state. **The wart is real and worth about 1 kB; every mechanism to fix
it costs two to three times that.**

### Where the headroom came from instead

Deleting `modules` returned 6.45 kB, which more than paid for the validators.
The budget is satisfied by accident rather than by design, and 4.2 kB is not
much given the size of the per-device wiring work ahead.

---

## 4. The control inventory

Which controls in the UI actually reach hardware, and which do not.

### ⚠️ The correction that resized this work

Wiring the dead controls was scoped as a large contract surface needing new Rust.
**It mostly is not.** `libs/openrazer/src/request.rs` already declares, and
`commands.rs::run_capability` already routes and dispatches, all of:

`GetDpi` · `SetDpi {x,y}` · `GetMaxDpi` · `GetBrightness` · `SetBrightness` ·
`SetChromaStatic` · `SetChromaSpectrum` · `SetChromaWave {direction}` ·
`SetChromaBreath` · `SetChromaNone` · `GetBatteryLevel` · `IsCharging`

`run_capability` is registered in `lib.rs` and the Razer arm is live. The TS side
never calls them: `capability.ts` declares only the three `Twinkly*` requests,
and its own comment says entries join the union as callers appear. So lighting,
brightness, DPI and battery are **frontend-only work**.

### A — reaches real hardware today

| Control                                                                   | Path                                      |
| ------------------------------------------------------------------------- | ----------------------------------------- |
| Groups: create, rename, membership, ambience, cadence, start/stop, remove | `invoke` → Rust → engine → paints devices |
| Strip page: power, colour                                                 | `run_capability` → HTTP → Twinkly         |
| Backgrounds: choose folder, set wallpaper, apply palette to a group       | filesystem + desktop setter + engine      |
| Settings → sources: Chroma, Twinkly                                       | localStorage + `watch_twinkly`            |
| Device dialog's status line                                               | read from real `GroupStatus`              |

### B — writes nowhere, capability already exists in Rust

| Control                                                       | Where it stops                          |
| ------------------------------------------------------------- | --------------------------------------- |
| Lighting → effect + settings, on mouse / keyboard / mousemat  | `ApplicationStore.lighting`, memory     |
| Lighting → brightness, all three                              | same                                    |
| Lighting → "apply to all devices" ×2                          | same                                    |
| Mouse → performance → sensitivity (staged, 1 value, 5 stages) | component `model()`, lost on tab switch |
| Mouse page → battery indicator                                | **hardcoded, see §5**                   |

### C — writes nowhere, and Rust has nothing behind it

Mouse polling rate; sleep-after and low-power threshold; key bindings on mouse
and keyboard (two layers each, full ANSI grid); gaming mode (six switches);
snap-tap; the camera image panel (preset, brightness, contrast, saturation,
white balance, auto-WB) and autofocus. All stop at component state and are lost
on a tab switch.

⚠️ `ux` has since contested the classification of **polling rate**, reporting
that the daemon does expose `getPollRate`/`setPollRate` and only the Rust routing
arm is missing — which would move it to group B. Not re-verified here.

### D — special cases

- **`lighting-switch-off-panel`** ("When display is turned off", on all three
  lighting sections). The component class is **empty** and the checkbox has no
  binding at all. It does nothing whatsoever, not even in memory. Both `ux` and
  `po` have since decided it should be deleted rather than disabled.
- **Settings → language.** Reaches the store; nothing is translated. The store's
  own comment says "Recorded, not yet acted on."
- **Studio page.** The whole ambience builder feeds only its own preview; there
  is no way to apply what you build to a group, and nothing on screen says so.
- **Section memory** (which tab was last open per device). Store-only, and that
  is **correct** — it is UI state, not a device setting. Listed so nobody
  "fixes" it.

### The honest-disclosure precedent

`sources-panel` already does this well: the Govee row stays visible, its switch
is `[disabled]`, and `SOURCE_DETAILS` carries the reason. It is driven from a
`SOURCES_UNAVAILABLE` data list, so it generalises cheaply. `ux` has published
the scaled-up pattern in `design/disabled-state-patterns.md`.

---

## 5. Defects found

### Fixed

#### The three no-daemon paths (ticket 0004)

Verified empirically with a refusing mock, not reasoned about.

`getDevices` rejecting does **not** block the dashboard — `devicesResolver`
discards the promise. It was an unhandled rejection, and the dashboard rendered
with every participant tile showing a **raw serial number, no name and no
picture**, with nothing saying the daemon was missing. It reads as corrupted
data rather than as absent hardware.

⚠️ **A second, worse bug sat beside it.** `watchForChanges()` asserted the
Twinkly watch as its **first `await`**, before subscribing to anything. A backend
that refused it aborted the method, so `devices_changed` was **never subscribed
to** — hotplug silently dead for the entire session, on precisely the machines
least able to afford it. Confirmed by emitting a hotplug event after a refused
watch and watching it land nowhere.

All three now behave like `getGroups`, which was already fixed for this bug class
and documents it. On failure the previous value is kept rather than wiped: a read
that failed says nothing about whether the hardware is still there.

**Still open**: what the user should be _told_. The app is now honest in the
console and silent on screen. That is a product question and belongs with `ux`'s
capability-states work one level up — this is the whole Chroma source being
unavailable, not one control.

#### `ux`'s `NG04002` crash — fixed as a side effect

Clicking Modules threw `Cannot match any routes: 'module/twinkly'`. The bar
offered modules and `app.routes.ts` never had a route; the `console.warn` guard
in `Navigation` could not fire because an unmatched segment **rejects** rather
than resolving `false`. Both entry points are gone with the feature. A regression
test asserts `/module/twinkly` now reads as home.

#### The Storybook static-dirs defect — not mine, one line, was blocking everything

`staticDirs: ['..', …]` served the whole of `apps/synapse/`, which sweeps
`src-tauri/target/` into the static build — **15 GB** of Rust artifacts once
anyone has run `cargo build`. The copy fails outright: cargo hardlinks its
binaries and Node's recursive `cp` cannot set timestamps on them
(`ENOENT … utime`).

It was green for as long as nobody had built the Rust locally, so it broke on
contact with a second person rather than on the change that caused it. `'../src'`
is what actually serves `assets/**`; `'..'` only added `public/`. Fixed to
`['../public', '../src']`.

### Found and not fixed

#### ⚠️ The mouse battery indicator states a false fact

`mouse-page.ts` holds
`signal({ level: 62, charging: false })` — a hardcoded reading presented as this
mouse's battery. Every mouse, always.

This is worse than a control that does nothing: a dead control disappoints, a
false reading misinforms and cannot be discovered as wrong. Both capabilities
already exist (`GetBatteryLevel`, `IsCharging`), so it is frontend-only.

**It was next on the queue and was not started before stand-down.** `po` had it
as ticket 0010 and first in Track B. `ux`'s position — which is right — is that
this is not a disclosure-pattern question at all: the fix is to stop rendering a
value nothing measured.

#### ⚠️ Per-device control state is lost on a tab switch

The section components are rendered through `ngComponentOutlet` and the pages
pass **only `device`**. Every `model()` on a section — DPI stages, polling rate,
key bindings, sleep-after — starts at its default each time the section renders
and is discarded when you leave the tab. Set five DPI stages, click Lighting,
click back: gone.

This is a correctness bug independent of the wiring question, and it will be
misdiagnosed as part of the new work once staging ships. `ux` has asked that
stage state get a real home surviving the dialog closing;
`core/stores/wallpapers-store.ts` is the pattern to copy — root-provided,
per-feature, and **built from a factory rather than a module-level constant**,
because reading storage at module load froze the value for the whole process
here once already.

Not fixed: `po` is holding it uticketed until Track B settles which controls stay
local-only.

#### ⚠️ The Storybook play suite is flaky under load, not broken

Reported as a hard regression: all 50 suites and 171 play tests failing with
`ReferenceError: Cannot access 'blue' before initialization`, hypothesised to be
a circular import between the `libs/ui` barrel and the theming module surfacing
as a temporal dead zone in the preview bundle.

**Investigated and not reproduced. There is no cycle.** Both halves of the
hypothesis were checked directly rather than assumed:

- **Nothing in `libs/ui/src` imports its own barrel** (`@synapse-copycat/ui`),
  which is the shape that produces a TDZ.
- The theming chain is a strict DAG: `oklch.ts` imports **nothing at all**,
  `palette.ts` imports only `./oklch`, `theme.ts` imports only `./palette`.
  `.storybook/theme-picker.ts` has no imports. There is nothing to be read
  before initialisation.
- `libs/ui` does not import `libs/backend-api`, so the one cross-library edge
  that exists (`backend-api → ui`, §7) is not a cycle either.
- `blue` does not exist as an identifier anywhere in the tree except one
  spec-local `const` in `compose.spec.ts`, which is not in the preview bundle.

Five runs of the same tree gave three different outcomes:

| Run                                     | Result                                         |
| --------------------------------------- | ---------------------------------------------- |
| Isolated                                | **50 suites / 171 tests green**                |
| Isolated                                | **50 suites / 171 tests green**                |
| Isolated, with a build raced against it | **50 suites / 171 tests green**                |
| Under contention                        | 1 suite failed — jest worker killed, `SIGSEGV` |
| Under contention (reported)             | 50 suites / 171 tests, the `blue` TDZ          |

The SIGSEGV run is the informative one: the failing suite was
`checkbox.stories.ts`, which nothing in this round touched, and the failure was
a worker process being killed rather than any assertion. The test runner
defaults to one Chromium worker per core — 23 on this machine — and several
agents were running Rust and Storybook builds at the same time.

**The most likely cause of the `blue` error is a torn preview bundle**: two
processes writing `dist/storybook/synapse` at once, so the served JS is a mix of
old and new chunks. That fits the blast radius exactly — `preview.ts` applies
`withThemePalette` to _every_ story, so a corrupted preview kills all 50
identically, including untouched ones like `Select`. It is the same class as the
two races already confirmed today: the `sb-common-assets/favicon.svg` `ENOENT`
on a file that demonstrably exists, and the Compodoc `documentation.json`
contention.

**No fix applied, because no defect was found.** What would help, and is not
done:

- Cap the runner's workers (`--maxWorkers`) so the suite does not open 23
  browsers on a machine shared with cargo.
- Give `build-storybook` and `test-storybook` distinct output directories, or a
  lock, so two agents cannot tear each other's bundle.

⚠️ Do not chase this as a source bug without first reproducing it **alone, on an
otherwise idle machine**. Three isolated runs were green.

#### The dead `lighting-switch-off-panel`

Described in §4 D. Decided for deletion by `ux` and `po`; not done.

#### Stories are in no tsconfig

`apps/synapse/tsconfig.app.json` excludes `**/*.stories.ts`, so the new
`typecheck` target does **not** cover stories. Two story breakages in this round
(`getModules()` in `default-layout.stories.ts`, and an `.mdx` referencing a
removed story) were caught only by the Storybook build, and only after `qa` ran
it. `.storybook/tsconfig.json` exists and could be added to the typecheck target;
not done.

#### `Module['kind']` had a `'goove'` typo

Resolved by deleting the feature rather than fixed. `backend` confirms Rust has
no `Module` type at all and will spell it `govee` when `modules` is implemented.

---

## 6. Proposed CLAUDE.md corrections

**Not applied.** CLAUDE.md is the maintainer's operating manual. Three sections
are stale, with evidence.

### §10 — the urgent one

Currently:

> ⚠️ **Coverage is currently very thin** — 5 spec files for the whole workspace,
> and `libs/ui/src/lib/button/button.spec.ts` is a placeholder asserting
> `expect(true).toBe(true)`. The Rust backend has no tests at all.

Every clause is false. There are **61 spec files and 50 stories**, not 5.
`button.spec.ts` is **9 real tests** covering native semantics, the anchor form,
variants, focus and the disabled path. The Rust backend has **156
`#[test]`/`#[tokio::test]` functions** (counted at the time of writing, and
still growing) across `src/` and 8 integration files in `src-tauri/tests/`.

Suggested:

> Coverage is real but uneven: 61 spec files and 50 stories on the TypeScript
> side, over 150 tests on the Rust side across `src/` and `src-tauri/tests/`. It is
> thinnest on the app's own components. When you change behaviour, add the test
> — but a green run now means something, so read a failure as a real signal.

**Why this is the urgent one**: the current text tells every new agent not to
trust a green run. That was good advice when written and is now exactly
backwards — it invites people to ignore the suite that would have caught them.

### §8 — the theming block

It calls the theming SDK "**a work in progress, not a finished system**" and the
component theme files "sketches and experiments toward the design below". The
design it describes as aspirational is built: `libs/ui/src/lib/theming/` has the
OKLCH tone ladder (`oklch.ts`, `palette.ts`), `ThemeService` publishing the
palette as CSS custom properties, `HexColor` validating at the boundary, and
`AmbienceTheme` tying the palette to the running group's colour — hue and chroma
only, lightness from the ladder, exactly as specified.

Suggested: keep the whole design rationale, retitle the block from intent to
description, drop the "sketches and experiments" framing.

### §13.8 — the contract divergence entry

The TS half is resolved: `devices` is registered and answered, and the store
calls it successfully. The entry's closing claim that "`BackendCommands` is
hand-written and nothing verifies it against Rust" **is still true** and worth
keeping — it is the same root cause as the generated-bindings problem, and it is
now the standing risk since both generators were removed.

Suggested: delete the resolved first half, keep the unverified-contract sentence,
and point it at the golden-JSON-fixture work that replaces codegen.

### Also stale

§13.4 lists `src-tauri/src/__commands.zip` as committed in the Rust sources —
worth re-checking. §13.6 mentions the commented-out `devices` and `modules`
commands in `lib.rs`; `modules` is now deliberately gone rather than pending.

---

## 7. Module boundaries — the rule is installed and enforcing nothing

`eslint.config.mjs:23`:

```js
depConstraints: [{ sourceTag: '*', onlyDependOnLibsWithTags: ['*'] }],
```

Everything may depend on everything. Compounding it, `apps/synapse` and
`libs/backend-api` both declare `"tags": []` — only `libs/ui` is tagged at all.

The visible symptom is `libs/backend-api` importing `HexColor` from
`@synapse-copycat/ui` (in `ambience.ts` and `wallpaper.ts`) — the contract
library depending on the design system, an edge nobody chose and no rule caught.
It also means importing anything from `@synapse-copycat/backend-api` creates a
graph edge to the whole `libs/ui` barrel.

**Deliberately not fixed.** Retagging changes what every future violation
reports, so it wants a decision about what the layers actually are rather than a
drive-by. The likely shape is `type:app` / `type:feature` / `type:util` with
`backend-api` forbidden from depending on `ui`, which would require moving
`HexColor` somewhere neutral first.

---

## 8. What is in flight elsewhere

Confirmed with `backend` and awaiting their build:

- **Golden JSON fixtures**, replacing what codegen was standing in for: Rust
  tests assert the exact serialised JSON per wire type into a committed file, and
  the matching valibot schemas parse the same file, so either side drifting goes
  red on both. Two tests already exist in this shape in `capability.rs`. Agreed,
  with two requests: store the fixture as the exact JSON **string** rather than
  pre-parsed objects, and deliberately include the five custom-serde cases
  codegen could not see — `Rgb`, `Achieved.perFrameMs`, all three `Cadence`
  variants, both capability-response arms, and a full `GroupStatus`.
- **One internally-tagged `kind` error union** across the group and device fault
  families, replacing the current split where the five mutations answer
  `GroupError` structurally and start/stop/remove stringify it into
  `BackendError::Protocol`. Confirmed unchanged. Note for whoever builds the TS
  half: `attempt()` keeps a **local** `failed` catch-all for things that are not
  from the backend at all — a dead IPC, a panic, a mock that threw — so `failed`
  is deliberately not a variant the backend should send.
- **`capabilities(participant) -> string[]`** is built and registered. The
  strings are the literal `type` discriminators `run_capability` accepts, so a
  control checks for the string it would later send. An empty array is a real
  answer; an unreachable device throws. Cache by participant, refresh on
  `devices_changed`.

**One question outstanding with `backend`**, which blocks the discovery-driven
rendering: does `capabilities` reject or return `[]` when there is no daemon at
all? That is the same distinction ticket 0004 turns on, and the two should answer
it the same way.

---

## 9. Not started

Per the stand-down instruction, none of the following was begun:

- The battery indicator fix (§5) — first in Track B and the highest-value item
  left.
- The tab-switch state loss (§5).
- Any Track B capability: DPI, brightness, Chroma effects, polling rate.
- Deleting `lighting-switch-off-panel`.
- The module boundary tags (§7).
- Adding this page to `apps/docsite/.vitepress/config.mts` — the sidebar is a
  shared file and `backend-handover.md` is not listed there either, so both are
  currently reachable only by path.
