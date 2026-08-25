# QA report — branch `10-integrate-ai`

Final snapshot, 2026-08-25, commit `762fdb6` (nothing committed during this
pass; everything described below is in the working tree for the maintainer).
This supersedes every earlier number given verbally during the session —
several were corrected mid-flight as more work landed, and this document is
the one place all of that has been reconciled.

## The three modes, and what each one can prove

| #   | Mode                                                      | Backend              | Devices                                         | Proves                                                                     |
| --- | --------------------------------------------------------- | -------------------- | ----------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | Browser + mock (`nx serve synapse`, `nx e2e synapse-e2e`) | in-memory TS mock    | invented                                        | UI logic, flow, state                                                      |
| 2   | Tauri + fake daemon (`openrazer-fake.sh`)                 | real Rust, real DBus | OpenRazer's fake sysfs devices                  | the Rust ↔ OpenRazer conversation, capability discovery                    |
| 3   | Tauri + real hardware                                     | real Rust, real DBus | actual Razer peripherals, actual Twinkly string | everything — latency, firmware, the wireless link, what a frame looks like |

I could run modes 1 and 2 throughout. Mode 3 is maintainer-only — this
machine has no Razer hardware and no Twinkly string. Every result below
says which mode produced it; that separation is the single most valuable
thing in this document, more than any pass count.

---

## 1. Verdict, stated plainly

**The group/ambience engine is well covered. The per-device peripheral
surface is not, and as of this snapshot most of it does not reach hardware
at all.** Groups (create/rename/membership/ambience/cadence/start/stop/
remove) and the Twinkly strip are exercised end to end in mode 1 (Playwright)
and mode 2 (Rust integration tests against the fake daemon), and both are
green. Everything that looks like per-device Razer customization — Chroma
effects, brightness, DPI, polling rate, snap tap, gaming mode, low-power
threshold, wireless power saving — currently updates a signal and nothing
else (§5). That is being actively wired as of this snapshot (see `frontend`'s
and `team-lead`'s messages), so treat §5's table as dated the moment new
work lands, not as a permanent verdict.

**Launch and drive: verified. Render: still not, and that is a distinct
claim, not a rounding error on the first one** (§7). `team-lead` closed the
launch gap this report carried until late in the session: the packaged
binary starts under WSLg, stays up, and was driven end to end through its
own MCP interface against mode 2 — set a group's colour, started it,
watched 62 frames render on a real (fake-daemon) device, stopped it. That
is the strongest single result in this report and the closest thing here to
the maintainer's stated deliverable. What it does not cover: nobody has
seen the window — this machine has no screenshot tooling (`grim`, `import`,
`scrot`, `maim`, `xwd` are all absent) and Playwright's Chromium cannot
attach to a WebKitGTK window, so "renders correctly" stays an explicit,
ten-second-for-the-maintainer-to-close gap, not something either of us
worked around. Nor does it touch real hardware. See §7 for the exact scope
and the launch command. Separately, whether the bundle can be _produced_ at
all currently has two conflicting reports from the team (§7) that are not
reconciled here.

**Nothing here touched real Razer hardware, a real Twinkly string, Govee,
or a real desktop wallpaper mechanism.** See §8.

---

## 2. Baseline — automated suites, current numbers

Re-run cold immediately before finalizing this report (`.angular/cache`,
`node_modules/.vite`, `dist/`, nx daemon all cleared and restarted), and
repeated until stable — a first cold pass this session hit real,
reproducible source problems (§4 history); a later pass hit pure
environment contention from several of us running Storybook builds on the
same machine at once — both my own memory reading (stuck `jest`/headless-
Chromium processes eating 15+ GB, confirmed by `free -h`) and `team-lead`'s
sharper diagnosis (two `build-storybook` runs racing on the same Compodoc
output file, `apps/synapse/documentation.json`) are two facets of that one
cause. Both are recorded in §4 so neither reads as a phantom regression to
whoever reruns this — and so the collision hazard itself is on record for
the next person running these in parallel.

### Rust (`apps/synapse/src-tauri`)

```sh
cargo test --workspace
cargo clippy --all-targets
cargo fmt --check
```

- **121 tests pass, 0 failed** (app_lib 76, `no_daemon.rs` 5, `openrazer` lib
  8, `palette` lib+extraction 9, `twinkly` 11, `wallpaper` 10, plus 2
  doctests).
- **clippy: clean. fmt: clean.**
- **43 more are `#[ignore]`d**, needing mode 2:

  ```sh
  apps/synapse/src-tauri/scripts/openrazer-fake.sh start
  BUS=$(apps/synapse/src-tauri/scripts/openrazer-fake.sh env | sed -n "s/^export DBUS_SESSION_BUS_ADDRESS='\(.*\)'$/\1/p")
  DBUS_SESSION_BUS_ADDRESS="$BUS" cargo test --workspace -- --ignored --test-threads=1
  apps/synapse/src-tauri/scripts/openrazer-fake.sh stop
  ```

  **All 43 pass** (dbus_backend 10, engine 5, frame_budget 3, groups 7,
  painter 6, runner 5, state_engine 7).

  ⚠️ The fake daemon died once mid-session during an unrelated `nx` build
  (reported independently by `backend`, and I saw the same thing) — if a
  daemon-backed run suddenly reports "no daemon on any known bus," restart
  it with the `start` command above rather than assuming a regression.

### TypeScript / Angular

```sh
pnpm exec nx run-many -t lint test build
```

- `ui`: 179 tests / 18 files — pass, lint clean.
- `backend-api`: 38 tests / 4 files — pass, lint clean.
- `synapse`: **298 tests / 39 files — pass**, lint clean, production build
  clean (495.83 kB initial, under the 500 kB budget — an earlier build in
  this session briefly exceeded it by 2 kB with a stray unused `Card` import
  in `dashboard-page.ts`; both are gone now).
- `synapse-e2e`: lint clean save the untouched generated example.
- `docsite`: lint and build clean. A dead link (`./tickets/index` in
  `product/index.md`, the `tickets/` folder having grown to 25 files with
  no index for the directory link to resolve to) briefly broke the build
  while this report was being finalized — not caused by this report. Fixed
  by adding `tickets/index.md` (a 25-row status table); both `po` and
  `team-lead` reported making that fix, not reconciled which — independently
  reconfirmed here with a fresh, cold `nx run docsite:build`: clean.

### Storybook plays — the only suite that runs in a real browser

```sh
pnpm exec nx run synapse:build-storybook   # the build alone
pnpm exec nx run synapse:test-storybook    # build, serve, run the plays
```

**Currently green: 50 story suites, 171 tests, exit 0** — `team-lead`'s
final, isolated re-run. That number moved twice in this same session before
landing here, and the history is worth keeping rather than collapsing away
(§4 has the full postmortem):

1. Genuinely broken by leftover Modules-removal references (§4a) — fixed.
2. Then briefly, systemically failing on every single play with
   `ReferenceError: Cannot access 'blue' before initialization` — one
   circular-import-shaped bug, not fifty independent ones, since a story
   with nothing to do with recent work (`UI library / Select`) failed
   identically to `group-card`. `team-lead` isolated and reported this to
   `frontend`; whatever fixed it happened between that report and their
   final re-run — not confirmed which change, only that the suite is clean
   again now.
3. In between both, and orthogonal to either: two or more of us running
   `build-storybook` concurrently produced shifting, misleading filesystem
   errors (`ENOENT: utime`, `EEXIST: mkdir`, a `piscina` assertion) from
   racing on Compodoc's shared `documentation.json` — not a source bug at
   all (§4b).

Per root AGENTS.md §1, this is the only suite that can prove a pointer drag,
focus behaviour, or computed layout at all — jsdom (under every `.spec.ts`)
cannot measure any of the three. With it green, that coverage is real again.

### Playwright (`apps/synapse-e2e/`)

```sh
pnpm exec nx e2e synapse-e2e
```

**10 passing, 1 correctly `test.fixme()`.** Stable across five repeated runs
in this final pass (one intermediate run showed 1 failure that did not
reproduce on immediate retry — same memory-pressure flakiness as the
Storybook suite, not the app; see §4). Coverage and rationale in §6 — per
the wind-down instruction, no new scenarios were added in this pass.

---

## 3. The new test dimension: does a control reach hardware at all

This is now, by the team's own decision, the primary axis — more important
than whether a control's own UI behaves correctly. A Playwright test
against the mock, or a Storybook play, **cannot tell the difference**
between a control that writes to hardware and one that only updates a
signal: the mock answers either way, and no DOM assertion sees an IPC call
that never happened. The only way to answer this per control is to check
whether an `invoke`/`run_capability` call exists in the code path at all
(source-level, done below) or to intercept `BackendApiService.invoke`
directly (a technique `frontend` suggested and I have not yet built into
the suite — see §6).

**Verified independently from source** (`application-store.ts` and each
panel component), not relayed secondhand:

| Control                                            | Where                             | Reaches the backend?                                                                |
| -------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------- |
| Per-device Chroma effect (`setEffect`)             | `application-store.ts:390`        | **No** — `patchState` only                                                          |
| Effect settings (`setEffectSettings`)              | `application-store.ts:407`        | **No** — same                                                                       |
| Brightness (`setBrightness`)                       | `application-store.ts:417`        | **No** — same                                                                       |
| DPI / sensitivity                                  | `sensitivity-panel.ts`            | **No** — bare `model()`, no invoke in the component or its parent                   |
| Polling rate                                       | `polling-rate-panel.ts`           | **No** — same pattern                                                               |
| Snap tap                                           | `snap-tap-panel.ts`               | **No** — same                                                                       |
| Gaming mode                                        | `gaming-mode-panel.ts`            | **No** — same                                                                       |
| Low-power mode threshold                           | `low-power-mode-panel.ts`         | **No** — same                                                                       |
| Wireless power saving                              | `wireless-power-saving-panel.ts`  | **No** — same                                                                       |
| Key bindings (mouse + keyboard)                    | per `frontend`'s report           | **No** — component-local state, not independently re-verified by me                 |
| Camera image panel                                 | per `frontend`'s report           | **No** — same, not re-verified                                                      |
| `lighting-switch-off-panel`                        | per `frontend`'s report           | **No** — component class is reportedly empty, checkbox unbound; not re-verified     |
| Twinkly strip power                                | `application-store.ts:509`        | **Yes** — `run_capability` / `TwinklySetPower`, queued                              |
| Twinkly strip colour                               | `application-store.ts` (adjacent) | **Yes** — `run_capability`, queued                                                  |
| Group ambience / start / stop / membership         | `application-store.ts:614`–`711`  | **Yes** — each its own `backendApi.invoke`                                          |
| Backgrounds (folder, wallpaper, palette-to-group)  | per `frontend`'s report           | **Yes**, reportedly — not independently re-verified by me                           |
| Sources switches (Chroma/Twinkly discovery gating) | per `frontend`'s report           | **Yes**, reportedly — `watch_twinkly` + localStorage; not independently re-verified |

**`frontend` also flagged a real, separate bug worth its own test whenever
Track B lands: per-device settings (DPI stages, polling rate, sleep-after,
low-power threshold, key bindings, gaming mode's six switches, snap tap) are
lost on switching tabs**, not just on quitting — the customize sections
render through `ngComponentOutlet` with only `device` passed in, so nothing
carries a value across a tab change. Reproduces reliably per their report;
not independently re-verified by me in this pass, and worth a Playwright
test the moment it is prioritized.

**This table is a snapshot, not a forecast.** `team-lead` has confirmed the
five inert per-device pages are actively being wired now, which is why this
report cannot certify a wiring result for any of them — only the state at
the moment each suite ran.

### Contract drift is now unguarded

Both TS↔Rust binding generators (`tauri-typegen`, `tauri-specta`) are being
removed — `libs/backend-api/src/lib/generated/` goes with them (per
`team-lead`). **Nothing mechanically checks the TS contract against Rust any
more.** CLAUDE.md §13.8 already records one instance of this exact drift.
Concretely, per `team-lead`'s example: `Cadence` was typed
`['Slow','Normal','Fast']` in TS while Rust carries
`#[serde(rename_all = "lowercase")]`, and a float was typed as a `Duration`
— casing and numeric representation are where this kind of drift hides, and
a green Playwright run against the mock cannot catch either, because the
mock is built from the (possibly wrong) TS type in the first place.

**The only check available now is mode 2**: a capability's request/response
shape has to be exercised against the real Rust backend over real DBus, not
just against the browser mock, before it can be called verified. No Track B
capability landed far enough during this session for me to run that check
against; when one does, it is the first thing that suite should do.
`backend` has proposed shared golden JSON fixtures (Rust asserts the exact
serialised bytes, valibot parses the same file) as a cheaper long-term
version of this same check — I have not evaluated it yet, but it is a
reasonable direction and worth a look before Track B produces much volume.

**One capability contract fact from `backend`, worth recording before Track
B tests get written against it:** the `capabilities(participant)` command
**rejects with `DaemonUnavailable` when there is no daemon — it never
returns `[]`.** A test asserting an empty capability list on a daemon-less
device would be asserting the wrong shape of failure. Separately, a
`twinkly-` participant still succeeds through this path regardless, because
Twinkly capability discovery never touches the Razer backend at all.

**Two long-standing gaps CLAUDE.md recorded are now closed, per `team-lead`:
`libs/backend-api/src/lib/generated/` is genuinely deleted (not merely
"being removed" as I had it), and a `typecheck` target now exists covering
the library configs — `tsc -p tsconfig.lib.json`, which used to carry 20+
uncaught errors and had nothing running it, is clean.** Worth using that
target going forward rather than the manual `tsc -p ...` invocations this
report used earlier in the session.

**One behavioural change from `frontend`, worth knowing before reading any
future device count as a failure:** every backend read is now parsed with
valibot, and a record that doesn't validate is **dropped, not thrown** — the
rest of the list still comes through, with a `[synapse]`-prefixed
`console.warn` naming what was dropped and why. A contract mismatch
therefore no longer shows a broken device; it shows _fewer_ devices and an
easy-to-miss console line. **If a future Playwright run sees a lower device
count than a scenario expects, check the browser console for a `[synapse]`
warning before assuming the backend dropped support for something** — this
is exactly the kind of silent-but-not-broken failure mode Track B's contract
checks (above) need to watch for. `frontend` suggested failing a run on any
unexpected `[synapse]` warning; this suite does not do that yet, but it
would be a cheap, high-value addition.

---

## 4. Postmortems: four things that looked like one regression and weren't

**4a. The Storybook build broke for a real reason, then was fixed.** Earlier
in this session, with every cache cleared, the build failed on two leftover
references from `frontend`'s Modules-removal refactor:
`default-layout.stories.ts` called the by-then-removed
`ApplicationStore.getModules()` and asserted a `twinkly` nav button that no
longer existed; `appbar.mdx` referenced a `Narrow` story `appbar.stories.ts`
no longer exported. Reported to `frontend` directly at the time (along with
3 correlated vitest failures in `app.config.spec.ts` and `navigation.spec.ts`
for the same root cause). **All of it is fixed now.** `team-lead`
independently re-verified: `nx test synapse` is 39 files / 298 tests, all
passing; `navigation.spec.ts` now deliberately asserts that
`locationOf('/module/twinkly')` resolves to `{ on: 'home' }`, with a comment
saying why, rather than the old expectation the removal broke. The earlier
"172/172 passing" I reported before that breakage, and the "broken" status
I reported after it, were both accurate at the moment each was said.

**4b. Later in the same pass, the same suite intermittently failed again —
for an environmental reason, but a more specific one than I first
diagnosed.** I attributed it to a stuck process tree exhausting memory
(`ps aux` showed a `jest`/Playwright/headless-Chromium tree still alive and
consuming ~15 GB from firing `test-storybook` repeatedly; killing it
restored 22 GiB and fixed the run). `team-lead` found the sharper cause
independently: **two `build-storybook` runs — mine and theirs — colliding
on the same Compodoc output file**, `apps/synapse/documentation.json`.
Racing writers to that one file produce exactly the shifting, non-repeating
filesystem errors both of us saw (`ENOENT: utime` on one run, `EEXIST:
mkdir` on the next, a `piscina` assertion on a third) — not source bugs, not
one consistent bug, just whichever race lost that particular time. Waiting
for other runs to finish and removing the stale `documentation.json`
before running alone fixed it for both of us. **This is a real, general
trap for anyone running Storybook builds in parallel on this codebase**, and
is recorded here for that reason, not as a defect in the product.

`frontend` later corrected the record on the specific `ENOENT: utime` case:
it was not the `documentation.json` race after all, but 4d below — a
distinct, deterministic bug, only two of the three shifting symptoms
(`EEXIST: mkdir`, the `piscina` assertion) are actually explained by
concurrent builds. Keeping both explanations rather than picking one, since
each is confirmed for the symptom it covers.

**4c. A third problem was found underneath the first two, and was not
environmental — but it did not last long either.** With the build healthy
and run in careful isolation, the full play suite briefly failed 50/50 —
every test, one identical error
(`ReferenceError: Cannot access 'blue' before initialization`), suspected to
be a circular import through the theming decorator. Filed to `frontend`.
By `team-lead`'s next isolated re-run it was gone — 50 suites, 171 tests,
all green, exit 0. `frontend` independently confirmed the same green state
afterward, so this is now a triple-confirmed number, but nobody has named
what specifically fixed the `'blue'` error — worth asking `frontend`
directly if it matters later, rather than assuming their other fixes (below)
were the cause.

**4d. A fourth, genuinely separate and previously-latent bug — not mine, not
`team-lead`'s, not caused by concurrent builds — explains the specific
`ENOENT: utime` symptom in 4b.** `.storybook/main.ts` had
`staticDirs: ['..', '../src']`. The `'..'` entry serves the whole of
`apps/synapse/`, which sweeps `src-tauri/target/` into the static build —
harmless as long as nobody had built the Rust crate locally, and this
session was the first time `backend` had (for the packaging work in §7). At
15 GB of `cargo`-hardlinked binaries, Node's recursive `cp` cannot set
timestamps on the hardlinks and fails outright — deterministically, not as a
race. It looked like a new problem "caused" by whoever it broke on first,
when the config had been wrong the whole time. `frontend` found and fixed
it: `staticDirs` is now `['../public', '../src']` — `'../src'` is what
actually serves `assets/**`; the removed `'..'` was only ever needed for
`public/`, which is now named directly.

**Two practical notes for anyone running this target, from `frontend`
hitting both:** a timed-out `test-storybook` run can leave an orphaned
`http-server` on 6006, which then makes the port guard refuse every
subsequent run with "port 6006 is still serving something after 10s" — the
guard is correct, the orphan just doesn't clean itself up, so
`lsof -ti :6006 | xargs -r kill -9` before retrying. And two people building
into `dist/storybook/synapse` at once can throw `ENOENT` on a file that
demonstrably exists (`frontend` hit this on `sb-common-assets/favicon.svg`)
— that is the race, not a broken install; don't run this target
concurrently with anyone else.

---

## 5. Known live defects — current status, not just a list

Compiled from `po`, `ux`, `frontend`, `team-lead`'s reports across the
session, checked against source where the check was cheap. Status reflects
this exact snapshot; several moved between "live" and "fixed" _during_ this
session as other people's work landed. `frontend`'s own handover
(`apps/docsite/technical/frontend-handover.md`) independently lists the same
three still-live items below (battery, tab-switch state loss, the dead
`lighting-switch-off-panel`) in its own defects-found-and-not-fixed section
— cross-referenced there rather than duplicated in full here.

| Defect                                                                                                            | Status at this snapshot                                                                                                                                                                                                                                                                                                                                                                                                                                             | Source                                                   |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Dashboard "Modules" tile throws an uncaught `RuntimeError` (NG04002, no route for `module/twinkly`)               | **Appears moot** — the tile no longer exists in `dashboard-page.html`/`.ts` at all as of this snapshot (independently confirmed, zero references)                                                                                                                                                                                                                                                                                                                   | `po`/`ux`, superseded by the Modules removal             |
| `modulesResolver` throws under real Tauri (ticket 0001)                                                           | **Appears moot**, same reason — `modulesResolver` no longer exists                                                                                                                                                                                                                                                                                                                                                                                                  | `po`, ticket 0001                                        |
| `getDevices()` had no error handling where `getGroups()` did                                                      | **Fixed** — `getDevices()` now has an explicit `try`/`catch` with the same rationale comment as `getGroups()` (independently confirmed by reading both, `application-store.ts`)                                                                                                                                                                                                                                                                                     | `team-lead`                                              |
| Mouse page battery hardcoded to 62%, never charging                                                               | **Still live** — `mouse-page.ts:51`: `{ level: 62, charging: false }` (independently confirmed)                                                                                                                                                                                                                                                                                                                                                                     | `team-lead`/`frontend`, `po` has it flagged to fix first |
| Tray Quit leaves every device lit (`stop_all` documented, never called)                                           | **Not independently re-verified this pass** — `backend` reported fixing it ahead of a ticket; needs mode 2 or 3 to observe either state, and I did not re-run this check in the wind-down window                                                                                                                                                                                                                                                                    | `po`, `team-lead`                                        |
| `darken()` swallows a failed `set_chroma_static` silently (`let _ = …`)                                           | **Confirmed present, and by design in general** — `state.rs:373`'s own doc comment calls it "best effort." But `po` has since narrowed this to a **specific, P0 bug**, ticket 0014: it silently fails on the Basilisk Ultimate in particular, and `backend` is fixing it now, ahead of the capability-wiring tickets. Not something a "best effort" comment should be read as covering.                                                                             | `team-lead`, narrowed by `po` (ticket 0014)              |
| Per-device settings reset on switching customize tabs (DPI stages, polling rate, key bindings, gaming mode, etc.) | **Not independently re-verified** — reported in detail by `frontend` (`ngComponentOutlet` passes only `device`, nothing carries values across a tab change); reproduces reliably per their account                                                                                                                                                                                                                                                                  | `frontend`                                               |
| First-run groups not persisting                                                                                   | **Unclear — flagged by `team-lead`, but the Rust suite I ran has passing coverage that reads as the opposite** (`state_engine.rs`'s `a_first_run_puts_everything_in_one_group_and_draws_it` and `what_was_running_is_running_again_after_a_restart`, both green against the fake daemon). Not reconciled in this pass — worth asking whoever filed it whether it's a different, narrower scenario (e.g. browser/mock, which genuinely has no persistence by design) | `team-lead`                                              |
| "No way to delete a group from some paths" (`ux`)                                                                 | **Dashboard's own path works** (tested, §6). No second path found in this pass                                                                                                                                                                                                                                                                                                                                                                                      | `ux` via `po`                                            |

**For whoever builds Track B scenarios next:** `po` asked that anything
touching stopping a group or quitting the app wait for ticket 0014 (the row
above) to land first, so a known issue isn't chased as if it were new.

---

## 6. The Playwright suite (`apps/synapse-e2e/`)

Built against `po`'s criteria in `apps/docsite/product/journeys.md`; this
suite's own comments cite exactly which bullets each test covers. Per the
wind-down instruction, no scenarios were added beyond what is described
here.

**Files:** `src/pages/dashboard-page.ts`, `src/pages/studio-page.ts` (page
objects, located through accessible names); `src/fixtures.ts` (fresh
page/fresh mock per test); `src/journeys.spec.ts` (the suite).

**Config decisions recorded rather than left at generated defaults**
(`playwright.config.ts`): chromium only (the only shipping target is a
Linux Tauri webview — WebKitGTK — and neither Playwright's `webkit` nor
`firefox` is closer to that than `chromium`, so three engines bought no
fidelity for 3x the runtime); `reuseExistingServer: !process.env['CI']`
(reuse a developer's already-open server locally, always fresh in CI, for
the same reason the Storybook target's own port check exists).

| Journey (`po`'s §)                                     | Status             | Notes                                                                                                                                                     |
| ------------------------------------------------------ | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §1 Launch with no devices                              | **Blocked**        | mock's device list is hardcoded in `app.config.ts`, no seam to request zero; flagged to `frontend`/`po`, left as documented `test.fixme()`                |
| §2 Create a group                                      | ✅ 2 tests         | dialog shape, empty-name refusal, cancel, empty+stopped result                                                                                            |
| §3 Assign/move a participant                           | ✅ 2 tests         | keyboard-only path end-to-end; re-drop-in-place no-op proven by the control's absence                                                                     |
| §3 `alreadyTaken` race                                 | **Not attempted**  | needs two backend connections disagreeing; mode 1's mock is per-tab and can't race itself, and this looks like a single-window app so mode 2 can't either |
| §4 Author an ambience                                  | ✅ 2 tests         | via `/studio`, no group/device needed; live preview, channel independence, per-channel memory                                                             |
| §4 Applies live to a running group                     | **Not this suite** | proven instead by `groups.rs`'s `changing_a_running_group_takes_effect_without_a_restart` (mode 2)                                                        |
| §5 Start/stop a group                                  | ✅ 1 test          | immediate UI toggle only                                                                                                                                  |
| §5 device "achieving" line, stop-not-dark, Quit defect | **Needs mode 2/3** | not covered here                                                                                                                                          |
| §6 Delete a group                                      | ✅ 2 tests         | two-press confirm, members freed to tray, deleting a running group                                                                                        |

**The pointer drag itself** (`cdkDrag`/`cdkDropList`) is exercised by the
Storybook play in `dashboard-page.stories.ts`, not duplicated here with a
synthetic Playwright drag — the keyboard path this suite drives performs the
identical backend operation. Both are green as of this snapshot (§2).

**A caveat on the §4 ambience test, raised after it was written:** `po` has
since put the `/studio` route on hold — the maintainer wants it redesigned,
calling the current flow "not very useful" — and asked that no more test
investment go into it until that lands. The two tests already in this suite
against `/studio` predate that guidance. They should still be read as valid
today (they exercise `ambience-panel`/`ambience-preview`, which the studio
page's own doc comment says are shared with the group card, not something
unique to the page being redesigned), but expect them to need rework once
the redesign ships, and don't extend them meanwhile. The backgrounds route
is under the same hold and was never covered by this suite.

**Not done, and explicitly deferred by the wind-down instruction rather than
forgotten:** a red test pinning the Modules-tile crash (`po` offered this as
optional); an `invoke`-spy/recording-mock harness for the reaches-hardware
question (`frontend`'s suggestion, §3); a test pinning the tray-Quit defect
(`team-lead`'s Track B ask). All three are reasonable next work, not started
here because "no new Playwright breadth" arrived first.

---

## 7. The Tauri desktop bundle — packaging vs. running

Neither half of this section is something I ran myself — both are
`team-lead`'s work, taken at face value and reported here because the
maintainer's stated deliverable is exactly this: a Tauri application running
on Linux. I did not duplicate either check per `team-lead`'s explicit
instruction not to spend time on it.

### Whether it packages — two conflicting reports, not reconciled here

`team-lead` reported that `identifier` (template default `com.tauri.dev`,
CLAUDE.md §13.10 — a hard gate that had been masking the separately-
suspected `frontendDist` problem, §13.9, the whole time) is now set to
`dev.ahryman.synapse`, `backend` fixed `frontendDist` to
`../../../dist/apps/synapse/browser` (matching `serve-static`), and with
both fixed all three bundles built:

```
target/release/bundle/deb/synapse-copycat_0.1.0_amd64.deb       (13M)
target/release/bundle/rpm/synapse-copycat-0.1.0-1.x86_64.rpm    (13M)
target/release/bundle/appimage/synapse-copycat_0.1.0_amd64.AppImage (88M)
```

with one environment caveat: the AppImage stage needs Windows `$PATH`
entries stripped first on this WSL machine (`linuxdeploy` walks `$PATH` and
hits a permission error under `/mnt/c/...`); deb and rpm are unaffected.

**`po` separately reported that packaging was completely blocked** —
`tauri build` refusing immediately on `identifier` still being
`com.tauri.dev`, ticketed as 0023 awaiting a maintainer decision. Read
literally that contradicts the account above, and I flagged it rather than
picking a side, since I had been told not to spend time re-running
packaging.

**Resolved by `team-lead`, after this report was otherwise final.** `po`'s
account simply predates the fix and reached me out of order — the
hypothesis I offered was the right one. Verified live against the working
tree at the time of writing:

- `tauri.conf.json` carries `"identifier": "dev.ahryman.synapse"`
- `tauri.conf.json` carries `"frontendDist": "../../../dist/apps/synapse/browser"`
- all three artifacts are present under `target/release/bundle/`, and the
  deb's payload contains a real desktop entry
  (`usr/share/applications/synapse-copycat.desktop`) and icon set

**Ticket 0023 is therefore stale, not open.** Whoever reads it should treat
it as closed by the identifier decision.

Worth keeping the reason 0023 ever existed, because it is the sharpest
lesson here: the identifier was a _hard gate_ that fired before `tauri
build` ever read `frontendDist`. One known issue (§13.10) masked the other
(§13.9) completely, which is why the wrong asset path could sit in the
config unnoticed for so long and why neither entry could have been closed
on its own. A defect behind a gate is invisible for exactly as long as the
gate holds.

### Whether it runs — launch and drive verified; render still open

`team-lead` closed this gap late in the session. The packaged binary
(`./target/release/app`) launches under WSLg (`DISPLAY=:0`,
`WAYLAND_DISPLAY=wayland-0`) with `DBUS_SESSION_BUS_ADDRESS` pointed at the
fake daemon, stays up, and starts an MCP server on `127.0.0.1:8730/mcp` (the
untracked `apps/synapse/src-tauri/src/mcp/` seen at the start of this
session). Two benign log lines are worth knowing rather than chasing:
`libEGL warning: DRI3 error: Could not get DRI3 device` (software rendering
under WSLg) and a `libayatana-appindicator` deprecation notice.

`team-lead` then drove it end to end over that MCP channel, against mode 2:

| Call                       | Result                                                                                          |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| `initialize`               | protocol `2025-06-18`, server `rmcp 2.2.0`, session established                                 |
| `tools/list`               | all 8 tools present                                                                             |
| `list_groups`              | real persisted state, including a group with a 5-colour palette source                          |
| `set_group_colour #ff00aa` | `"set"` — ambience became `{"type":"fixed","rgb":"#ff00aa"}`                                    |
| `start_group`              | `"started"`                                                                                     |
| after 3s                   | Goliathus `XX0000000C02`: 62 frames rendered, `perFrameMs` 0.004916, cadence `fast`, `every: 1` |
| `stop_group`               | `"stopped"`                                                                                     |

**What this proves, stated at exactly the scope `team-lead` gave it — not
wider:** the packaged binary launches on this Linux machine, serves its MCP
channel, and drives a real group through the façade and engine to a device
with measured frame delivery. `painted: false` on the Goliathus is correct,
not a failure — it's a single-LED device, approximated rather than
matrix-painted, exactly as designed.

**What it does not prove, and why that gap is still open rather than closed
by proxy:** that the window renders correctly on screen. `team-lead` could
not see it — this machine has no screenshot tooling at all (`grim`,
`import`, `scrot`, `maim`, `xwd` are all absent) and Playwright's Chromium
cannot attach to a WebKitGTK window, so there was no way to check short of
a human looking at a screen. The process staying up and answering over MCP
is real evidence the application is _functional_, but it is not evidence
anything was ever _visible_ — those are different claims, and only the
first one is closed. The maintainer can close the second in ten seconds
with the launch command below and their own eyes; nothing here should be
read as having done that for them.

Nothing here says anything about real hardware either — this was the fake
daemon, which says yes to everything, and frame timings measured against a
device that writes to a file say nothing about what firmware will accept.
It also does not touch the packaging question above; this was run against
the debug binary, independent of whether the release bundles build right
now.

**A byproduct worth recording on its own**: this is the only thing in this
whole report that verifies the MCP channel itself works, end to end,
against the real backend. Nothing else here covers it.

The exact command for the maintainer to close the render gap themselves:

```sh
apps/synapse/src-tauri/scripts/openrazer-fake.sh start
pnpm exec nx run synapse:tauri
# confirm with your own eyes: window opens, dashboard renders, the fake
# daemon's groups appear
```

---

## 8. Explicitly out of scope, and why

- **Govee.** No LAN response from the devices, likely Bluetooth, no
  Bluetooth adapter on this machine.
- **Real Razer hardware and a real Twinkly string.** Mode 3 is
  maintainer-only; this machine has neither. Everything mode 3 alone could
  confirm is called out inline above (most importantly §3's whole "does it
  reach hardware" table, and the Twinkly strip's `run_capability` calls,
  which mode 2's fake daemon cannot even speak to — it has no Twinkly
  protocol support, DBus/OpenRazer only).
- **Desktop wallpaper setters, for real.** `libs/wallpaper/src/setters.rs`
  has 10 passing unit tests (counted in §2) that verify the _logic_ of
  choosing a setter per desktop environment (GNOME/KDE/XFCE/hyprpaper/swww)
  and the exact calls each would make — but this machine is WSL2 with no
  `XDG_CURRENT_DESKTOP` and no real desktop shell behind `gsettings` et al.,
  so no setter has actually been invoked against a real desktop here. `po`
  independently flagged the same gap: nobody on this machine can confirm a
  wallpaper actually lands on a real session, so any such claim needs
  maintainer verification, not a suite assertion.
- **The backgrounds folder picker.** Per `po`, it needs the native Tauri
  file dialog by design — there is no browser equivalent, so it cannot be
  driven from Playwright in browser/mock mode at all, by design rather than
  by gap.
- **The backgrounds and studio pages generally.** `po` has put both on hold
  for a redesign the maintainer requested — see §6's caveat on the two
  existing `/studio` tests, written before that guidance arrived.
- **Windows.** `backend/rest.rs` is Windows-only; CI runs `ubuntu-latest`
  exclusively; nothing here exercises that path.
- **All of Track B's capability-by-capability contract verification against
  mode 2** — see §3. A real gap, not merely unstarted breadth; no capability
  landed far enough during this session for the check to run against.
