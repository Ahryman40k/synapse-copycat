# Backend handover

Everything the Rust side gained in this round, everything it did not, and how
much of it is actually proven. Written at the point of standing down, so it is
a handover rather than a progress report.

**Nothing here is committed.** Every file listed is sitting modified in the
working tree for review. The list below is ordered to be read alongside
`git diff`.

---

## 1. What changed, file by file

### The fixes

#### `apps/synapse/src-tauri/src/lifecycle.rs`

**Quitting no longer leaves the room lit.**

`RazerState::stop_all` was written for the real quit — its own comment says
"so the devices are not left being driven by a process that is going away" —
and **nothing called it**. The tray's Quit was a bare `app.exit(0)`. So
quitting left every peripheral and every light string showing the last frame a
process that no longer exists had painted, with nothing running that could turn
them off. It never showed up as dead code because the method is `pub`.

Three things were added:

- `quiesce()` — stops every group on the way out, reached from the one exit
  path that is real.
- `exiting(code)` — the decision, split out from the event. `RunEvent` and its
  `ExitRequestApi` cannot be constructed outside Tauri, so the rule could not
  otherwise be tested; extracted, it can be. ⚠️ It also pins a trap: the tray's
  Quit is `app.exit(0)`, and `0` is a code like any other. Read as "no code"
  the application could never exit at all, and the bug would have been reported
  as "Quit does nothing" and blamed on the timeout below.
- `QUIESCE`, a five-second bound. Stopping lets each runner finish its frame
  and then darken its device, which is device I/O — an unreachable strip
  carries its own three-second HTTP timeout. Unbounded, one wedged device makes
  Quit appear to do nothing. It logs and exits anyway when it expires.

Groups keep their `started` flag and nothing is persisted here, so the next
launch resumes: quitting the application and switching an ambience off are two
different requests.

#### `apps/synapse/src-tauri/src/razer/state.rs`

Two changes.

**A first run now writes itself down.** Every other save happens because the
user changed something. A first run changes nothing — the "All devices" group
is invented at startup — so the file did not exist until the user happened to
rename a group or move a slider, and until then a quit lost the lot. `next_id`
went with it, which is worse than losing a group: ids were handed out a second
time after a restart, so a reference the interface still held would quietly
address a _different_ group. `initial_conductor` now also answers whether the
groups were invented here, and `new` saves when they were.

⚠️ **One case deliberately still does not save**: a first run that finds no
devices. Otherwise a machine whose daemon is not installed yet writes an empty
file, that file makes every later launch a returning one, and the welcome —
everything in one group, already drawing — is spent on an empty machine and
never offered again once the hardware arrives.

**`capabilities(participant)`** was added as a façade method (see §2).

#### `apps/synapse/src-tauri/tauri.conf.json`

`frontendDist` was wrong, exactly as the known-issues list suspected, and is now
`../../../dist/apps/synapse/browser`. The `tauri-typegen` plugin block was also
removed (§3). The `identifier` in the same file was set to
`dev.ahryman.synapse` by the maintainer rather than by this work — see §7 for
why that mattered far more than it looks.

### Capability discovery

| File                                       | What it gained                                                                                                                         |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `libs/openrazer/src/request.rs`            | `CapabilityRequest::name()`, the `CATALOGUE` mapping every capability to the DBus methods it needs, `supported_from()`, and four tests |
| `libs/openrazer/src/backend/mod.rs`        | `DeviceBackend::supported_methods()` on the trait                                                                                      |
| `libs/openrazer/src/backend/dbus.rs`       | the introspection call, `parse_methods()` for the XML, and four tests                                                                  |
| `libs/openrazer/src/backend/rest.rs`       | the Windows counterpart — optimistic, and says so                                                                                      |
| `libs/openrazer/Cargo.toml`                | `quick-xml`, already in the lockfile via zbus                                                                                          |
| `apps/synapse/src-tauri/src/capability.rs` | `TWINKLY_CATALOGUE`, the light-string half                                                                                             |
| `apps/synapse/src-tauri/src/commands.rs`   | the `capabilities` command                                                                                                             |
| `apps/synapse/src-tauri/src/lib.rs`        | its registration in `invoke_handler!`                                                                                                  |

### The deletions

| File                                                               | What went                                                   |
| ------------------------------------------------------------------ | ----------------------------------------------------------- |
| `apps/synapse/src-tauri/build.rs`                                  | the whole `tauri-typegen` invocation; it is now three lines |
| `apps/synapse/src-tauri/Cargo.toml`                                | `tauri-typegen`, `specta`, `tauri-specta`                   |
| `apps/synapse/src-tauri/src/lib.rs`                                | the commented-out `commands::modules` registration          |
| `src/razer/device.rs`, `src/discovery/mod.rs`, `src/wallpapers.rs` | five `#[derive(Type)]` and their imports, which fed nothing |
| `Cargo.lock`                                                       | 637 lines, the dependency trees those crates pulled in      |

### Tests

| File                    | Added                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| `tests/state_engine.rs` | quit stops the engines and still comes back; a first run is on disk before anything is changed |
| `tests/no_daemon.rs`    | a first run with no devices stays a first run                                                  |
| `tests/dbus_backend.rs` | three discovery tests against real introspection                                               |

⚠️ The no-devices test lives in `no_daemon.rs` rather than beside its sibling
in `state_engine.rs` because it sets `DBUS_SESSION_BUS_ADDRESS` process-wide,
which would poison the daemon-backed tests under `--include-ignored`.
`no_daemon.rs` exists for exactly that isolation.

---

## 2. Capability discovery

The question every per-device control has to ask before it renders: **what can
_this_ device actually be asked to do?** Without it, a control wired onto
hardware that lacks the capability errors on use — which is worse than the
inert page it replaces, because by then the user has tried.

### The API

```
invoke('capabilities', { participant })  →  string[]
```

The strings are **the exact `type` discriminators `run_capability` takes**, so
a control checks for the literal string it would later send. There is no second
vocabulary and no mapping table on the frontend.

A device that supports nothing returns `[]`. A device that cannot be reached
**throws**. Those two must stay distinct: greying out every control looks
identical in both cases and only one is the hardware's fault.

Precisely, since the frontend has to render each case differently:

| Situation                                 | Answer                                                         |
| ----------------------------------------- | -------------------------------------------------------------- |
| No daemon at all, Razer participant       | **rejects** with `DaemonUnavailable` — never `[]`              |
| No daemon at all, `twinkly-…` participant | **succeeds** — the light-string path never touches the backend |
| A strip no sweep has seen                 | **rejects** with `DeviceNotFound`                              |
| A device that genuinely publishes nothing | `[]`                                                           |

The second row is worth knowing: on a machine with a light string and no
OpenRazer, discovery still answers for the strip. That is the same principle as
`unassigned()` — no daemon means "no Razer devices", not "no participants".

### The mechanism, and why it is per method

DBus introspection of the device object, at runtime, parsed for
`interface.method`. **Not** interface presence — that is the finding that
matters most here, and it was arrived at the hard way.

Introspected against the six devices the fake daemon serves:

| Device               | The catch                                                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Goliathus Extended   | publishes `razer.device.lighting.chroma` **without `setWave`**                                                                    |
| Kraken Ultimate      | publishes chroma, but has **no brightness interface at all**, and no `setKeyRow`                                                  |
| Basilisk Ultimate    | publishes chroma with **only** `restoreLastEffect`, `setCustom`, `setKeyRow` — **no `setStatic`**, because its colour is per zone |
| Basilisk vs Huntsman | `getPollRate`/`setPollRate` exists on one and not the other, though **both** publish `razer.device.misc`                          |

So neither "this is a mouse, therefore DPI" nor even "this device publishes
`razer.device.misc`, therefore poll rate" is true. The only honest source is
what that specific device publishes, method by method.

⚠️ **The strongest evidence that this was necessary**: the first daemon-backed
test written for this asserted that the Basilisk supported the global static
colour. It failed. The device documented in `src-tauri/AGENTS.md` as the
example of this exact trap still caught the person who had just read it. An
interface-level implementation would have shipped, and would have offered three
controls that answer `UnknownMethod` on first use.

### Real output

Captured from the running daemon, not composed by hand:

```
Huntsman Elite    GetDeviceName … GetBrightness, SetBrightness, SetChromaStatic,
                  SetChromaSpectrum, SetChromaWave, SetChromaBreath, SetChromaNone
Goliathus Ext.    … GetBrightness, SetBrightness, SetChromaStatic,
                  SetChromaSpectrum, SetChromaBreath, SetChromaNone      (no wave)
Kraken Ultimate   … SetChromaStatic, SetChromaSpectrum, SetChromaBreath,
                  SetChromaNone                                    (no brightness)
Basilisk Ultimate … GetDpi, SetDpi, GetMaxDpi, GetBatteryLevel, IsCharging
                                                              (no chroma at all)
```

### Drift guards

The generated bindings are gone (§3), so nothing mechanically checks the
Rust↔TypeScript contract any more. Two guards were added on the Rust side so
that a capability cannot silently become undiscoverable:

- `CapabilityRequest::name()` is an **exhaustive match**, so a new capability
  does not compile without an arm.
- a test asserts every variant appears in `CATALOGUE`, so it does not pass
  without a discovery entry.

Between them, "the capability works but no control ever appears" — a failure
that is invisible in every other way — is now caught at build time.

### Twinkly

A constant, not introspection: the protocol is the same on every device that
speaks it. Firmware does vary — the colour endpoint needs 2.7.1 — and that
cannot be known without asking, so `TwinklyGetLighting` is reported as
available and fails honestly on an older string rather than being hidden from a
device that probably has it.

### Windows

`rest.rs` claims the whole catalogue. The REST bridge publishes no
introspection, so there is nothing to ask. Claiming everything keeps Windows
behaving exactly as it does today; claiming nothing would grey out the entire
interface on a platform where the capabilities are merely unknown. **This is a
stated assumption, not a verified one** — see §6.

---

## 3. The deletions

### `modules`

Removed. Worth recording _why_ it was safe: there was never a `Module` type or
a `modules` implementation in Rust at all — only a commented-out registration.
The dashboard was invoking a command that had never existed, and the browser
mock was hiding a live crash.

That finding grew: the maintainer decided to delete the whole feature, so the
TypeScript `Module`, `WireModule`, the mock and the resolver went too, along
with the appbar's overflow menu — the module entries were the only data-driven
entries in the bar and therefore the only ones that could overflow. It also
resolved a routing bug for free: clicking a module threw `NG04002` because the
bar offered modules and the routes never had an entry for them.

⚠️ The known typo is therefore moot: the TypeScript spelt the kind `'goove'`
where it meant `'govee'`, and it was load-bearing only because the mock was the
sole producer. When `modules` is genuinely implemented, spell it `govee` and
agree the wire shape with the frontend first.

### The two binding generators

Both out. The reasoning, since it closes a long-standing question:

**`tauri-typegen` cannot emit valibot.** Reading the crate source,
`generators/mod.rs` matches exactly two values — `"zod"` and anything-else-
means-none. The option the known-issues list hoped for does not exist.

**And it would be wrong even with validation switched off**, which is what
actually decides it. Five things crossing this IPC have serde behaviour no
type-scraper can see:

- `Rgb` has a hand-written `impl Serialize` emitting `"#rrggbb"` while
  structurally being `{r, g, b}`
- `Achieved::per_frame` uses `serialize_with`
- `AnyCapabilityRequest` and `AnyCapabilityResponse` are `untagged`
- `Cadence` is an enum whose `rename_all` the generator ignored, emitting
  `['Slow','Normal','Fast']` where the wire carries lowercase

A generator would be wrong about all of them in the silent, data-corrupting
way rather than the compile-error way. `tauri-specta` has the same defect for
the same reason: `specta::Type` describes the Rust type, not the serde form.

⚠️ **The clearest statement of why that generator was never real**: the zod
came from `build.rs`, which hardcoded `validation_library: "zod"` and ran on
every build. The `tauri-typegen` block in `tauri.conf.json` said
`"validation_library": "none"`, named a different output path, and pointed
`project_path` at the TypeScript library rather than the Rust crate. Two
configurations, contradicting each other, and the one a reader would find first
was entirely decorative.

**The proposed replacement — agreed, not built.** Shared golden JSON fixtures:
Rust asserts the exact serialised bytes of every type crossing the IPC into a
committed file, and the valibot schemas parse the same file. Either side
changing the wire shape unilaterally goes red on both. Two such tests already
exist in `src/capability.rs`, so this generalises something working rather than
inventing a mechanism — and it covers the custom-serde cases codegen
structurally cannot.

The frontend agreed the shape, so whoever builds it should not re-litigate it:

- **One file, keyed by type name, with the JSON stored as a _string_** rather
  than as parsed objects — so both sides parse the same bytes. Stored parsed,
  the file has already done the parsing and an encoding or whitespace
  difference could hide.
- **Include the awkward cases deliberately**, since they are exactly what
  codegen could not see: `Rgb` both bare and nested in `Ambience.colour.rgb`,
  `Achieved` for the `perFrameMs` float, `Cadence` in all three lowercase
  variants, both `AnyCapabilityResponse` arms, and a `GroupStatus` with
  non-empty `devices` and `skipped`.

Two things already landed on the frontend side that reduce the exposure
meanwhile: a `typecheck` target now runs `tsc --noEmit` over the library
configs — the omission that let the broken generated folder survive — and the
`Cadence` casing is now a passing test that rejects the `'Slow'` form the
generator emitted.

---

## 4. Defects found and not fixed

### ⚠️ `darken` leaves a Basilisk lit — the most important one

**Not fixed. Not started.**

`RazerState::darken` calls `set_chroma_static` on every non-Twinkly
participant. The Basilisk Ultimate does not publish that method. The call is
best-effort (`let _ = …`), so it fails silently and **a Basilisk joining a
stopped group stays lit**.

This is the same defect already fixed once for light strings in `e58d3ca` — a
device in a disabled group staying on, its state not following its group's —
reappearing on the Razer path for any device without `setStatic`. Best-effort
error handling is why it was never reported.

**A better fix than consulting discovery**, found while documenting: the
duplication is the bug. `Runner::rest()` **already darkens correctly**, because
it goes through the surface the device actually has — painting black via
`setKeyRow`/`setCustom` on a matrix device, `setStatic` on an approximated one.
`darken()` reimplements that and gets it wrong. Making `darken` reuse the
surface logic fixes it and removes the second way of saying black.

The engine itself is safe today, but by luck rather than design: the only
device lacking `setStatic` (Basilisk) is painted, and the only device lacking
`setKeyRow` (Kraken) is approximated. A device lacking both would break the
engine too.

### The `darken` siblings audit — begun, not completed

A read-only scan, not a finished audit. Every place calling a hardcoded method
on every participant regardless of what it publishes:

| Site                              | Method                             | Status                                                                                                                            |
| --------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `state.rs:374` (`darken`)         | `set_chroma_static`                | **broken**, above                                                                                                                 |
| `runner.rs:286` (`Approximated`)  | `set_chroma_static`                | safe by luck, above                                                                                                               |
| `painter.rs:103,106`              | `set_key_row`, `show_custom_frame` | guarded — `Canvas::discover` checks `has_matrix` first                                                                            |
| `commands.rs:80` (`fetch_device`) | `get_device_image` + three others  | present on all six devices; ⚠️ unverified elsewhere, and a missing one drops the whole device from the list rather than degrading |

The last row is the one worth a second look: `fetch_device` uses `try_join!`,
so any one of four methods missing loses the entire device.

### Other defects, none fixed

- **No daemon reconnect.** `RazerState::new` tries once at startup;
  `watch::spawn_razer` gives up permanently if the subscription ends. Install
  or restart OpenRazer after the app and it must be restarted. Proposed policy:
  hold the backend behind an `RwLock<Option<Arc<dyn DeviceBackend>>>` and watch
  DBus `NameOwnerChanged` for `org.razer`, which makes "started late" and
  "restarted" the same event. No backoff needed — DBus tells us.
- **`engine::runner::preview()` is unreachable.** Written and documented for
  showing an ambience with no hardware, exposed by no command.
- **Two error shapes on one command surface.** The five group mutations answer
  `{"kind":"unknownGroup","id":7}`; `start`/`stop`/`remove` answer
  `{"Protocol":"no group 7"}`, stringifying the structured error away. Proposed:
  one union, internally tagged on `kind`, camelCase, across both fault families.
- **`BackendError` has become the whole application's error vocabulary.** A
  _wallpaper_ failure is stringified into `BackendError::Protocol`. A protocol
  crate is defining the application's language. This is the strongest argument
  for sequencing the error-shape work together with §5's `Surface` extraction —
  separately they are two refactors of the same seam.
- **`stop_all` silently differs from `stop`**: it leaves `started` set. Correct
  for quit, surprising to read, undocumented.
- **Circadian brightness runs on UTC** (`runner.rs`), so the evening arrives at
  the wrong hour for anyone not on Greenwich.
- **A still ambience on a strip pushes frames at full cadence forever** —
  deliberate, since frames are the rt-mode keepalive, but it could drop to a low
  keepalive rate when nothing changes.
- **`tauri.conf.json` `identifier` is still `com.tauri.dev`**, which blocks
  packaging entirely. See §7.

---

## 5. Two architecture proposals — designs only, nothing built

### `Surface` as the protocol boundary

`src/razer/mod.rs` already sets the condition: the abstraction should be
extracted "from two working implementations rather than guessed from one".
Razer and Twinkly both work, so the condition is met, and this gets more
expensive with every device type added.

**The seam is `Surface`, not a `Luminous` device trait.** The runner already
discovered the right abstraction and named it; it is a three-variant enum
(`Painted`, `Approximated`, `Streamed`) matched in four places. Make it a trait
— `geometry`, `is_painted`, `show`, `forget`, `rest` — and each protocol's
quirks stop being special cases visible to the runner.

**Plus a registry**, which is the half that removes the prefix. Each protocol
registers a source that can say whether it claims a `ParticipantId`, enumerate
its ids, open a `Surface`, and darken one. Then `runner.rs:121` and
`state.rs:369` stop reading `starts_with("twinkly-")`, and adding Hue or Govee
is one file plus one registration. `discovery/mod.rs` already asserts that
nothing outside the Twinkly code may read that prefix; today that is
aspirational, and this makes it true.

**What moves**: `src/razer/engine/` → `src/engine/`, since it drives Twinklys
too; `RazerState` to a cross-protocol name; and an application-level error type
replacing `openrazer::BackendError` as the app's vocabulary.

Behaviour-preserving throughout — the daemon-backed tests are the safety net.
Worth landing as its own commit with no behaviour change in it.

### The CLI as the third channel

**The activation model is the maintainer's and it stands**: `synapse <command>`
starts the app with a hidden window if it is not running, or applies the command
to the live instance if it is.

**The hole it leaves**: `tauri_plugin_single_instance` argv forwarding is
one-way. The second process hands over its arguments and dies without learning
whether the command succeeded, so `synapse groups` can never print and no
command can return a meaningful exit code.

**The correction**: keep `single_instance` as the **launcher**, not the
transport. An axum server already runs on loopback:8730 for MCP, mounted as
`nest_service("/mcp", …)`; a plain control route beside it is a few lines. The
CLI tries 8730 first, and spawns a hidden instance when nothing answers.
Activation model unchanged, queries and exit codes work, and it stays one
façade with three channels.

The simpler alternative is coherent: accept fire-and-forget and refuse query
commands from a second instance. It just gives up `synapse groups`.

---

## 6. What is verified, and how

⚠️ **A fake device says yes to everything.** `openrazer-fake.sh` runs the real
daemon against OpenRazer's fake sysfs tree, so it proves the shape of the calls
and the capability discovery. It never proves latency, firmware behaviour, the
wireless link, or what a frame actually looks like.

| Claim                                                           | Rests on                                                                                               |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| The catalogue covers every capability; introspection XML parses | **Unit tests**, no daemon                                                                              |
| The exit rule honours a coded exit and refuses an uncoded one   | **Unit test** on the extracted decision                                                                |
| Discovery reports real per-device differences                   | **The real daemon** against fake sysfs — the interface surface is genuine for these models             |
| Quit stops the engines, keeps `started`, resumes next launch    | **The real daemon**                                                                                    |
| A first run persists; an empty first run does not               | **The real daemon**, and a no-daemon process                                                           |
| `frontendDist` is correct                                       | **A real `tauri build`**, proven both ways — see §7                                                    |
| The build works without the generators                          | **A real `tauri build --no-bundle` release**, not `cargo check`                                        |
| The app packages as deb, rpm and AppImage                       | **All three artifacts actually built** — see §7                                                        |
| Windows `rest.rs` behaves at all                                | **Nothing.** Never compiled here; CI is Linux-only                                                     |
| Any of this works on real hardware                              | **Nothing.** No Razer device and no Twinkly on this machine                                            |
| The packaged app **launches and works**                         | **Nothing yet.** The bundles build; running one is a separate check                                    |
| The frame budget figures                                        | A fake device **writing a file**, where real hardware goes on to a USB report the firmware must accept |

Totals: **121 tests passing without a daemon**, **43 daemon-backed passing, 0
failing**, clippy silent across the workspace. Baseline at the start of this
round was 110 and 38.

The daemon-backed tests are `#[ignore]` by default, so a plain
`cargo test --workspace` silently skips all 43. Both runs are needed:

```sh
apps/synapse/src-tauri/scripts/openrazer-fake.sh start
BUS=$(apps/synapse/src-tauri/scripts/openrazer-fake.sh env \
  | sed -n "s/^export DBUS_SESSION_BUS_ADDRESS='\(.*\)'$/\1/p")
DBUS_SESSION_BUS_ADDRESS="$BUS" cargo test --workspace -- --ignored --test-threads=1
```

⚠️ The fake daemon died once during an `nx` build and needed restarting. If
every Razer test fails at once with "no daemon on any known bus", that is why.

---

## 7. `frontendDist`, and the packaging blocker

### `frontendDist` was wrong on both counts. Now fixed.

Paths in `tauri.conf.json` resolve from `apps/synapse/src-tauri/`. Checked
against a real production Angular build:

| Value                                      | Resolves to                 | Has `index.html`            |
| ------------------------------------------ | --------------------------- | --------------------------- |
| `../../../../dist/apps/synapse` (was)      | **above the repo root**     | no — does not exist         |
| `../../../dist/apps/synapse`               | `dist/apps/synapse`         | no — only `browser/` inside |
| `../../../dist/apps/synapse/browser` (now) | `dist/apps/synapse/browser` | **yes**                     |

Four `../` climbed one level above the repository, and the value omitted the
`browser/` subdirectory `@angular/build:application` emits.

**Proven in both directions, not merely resolved.** With the old value restored,
Tauri refuses with its own error naming the path outside the repo root:
_"Unable to find your web assets… frontendDist is set to
`../../../../dist/apps/synapse`"_. With the fix, the release build completes:
_"Built application at: target/release/app"_. The entry now also agrees with the
`serve-static` target, which had `dist/apps/synapse/browser` all along.

### Why it stayed unverified: one known issue was masking the other

`tauri build` used to refuse before it ever read `frontendDist`:

```
Error You must change the bundle identifier in `identifier`.
The default value `com.tauri.dev` is not allowed as it must be unique
across applications.
```

A hard gate, not a warning, and it fired **before** the path was consulted. So
the desktop bundle had never been buildable, and that is precisely how a wrong
`frontendDist` could sit unnoticed: **two known issues, one masking the other.**

That is the part worth remembering. A defect behind a gate is invisible for as
long as the gate holds, and neither entry could be closed without the other.

### Both are now resolved

**The identifier is `dev.ahryman.synapse`**, chosen by the maintainer and set in
`tauri.conf.json`. It was deliberately not chosen by this work: it becomes the
application's permanent identity on every Linux desktop and drives its config
paths, so it was never a developer's call.

**All three bundles build**, with the `frontendDist` fix in place:

```
13M  target/release/bundle/deb/synapse-copycat_0.1.0_amd64.deb
13M  target/release/bundle/rpm/synapse-copycat-0.1.0-1.x86_64.rpm
88M  target/release/bundle/appimage/synapse-copycat_0.1.0_amd64.AppImage
```

So the known-issues entries can both be retired: **§13.9 is resolved and proven
in both directions**, and **§13.10 is resolved**.

### ⚠️ The WSL trap that will cost the next person an hour

The AppImage stage fails on a first run under WSL:

```
failed to bundle project: `failed to run linuxdeploy`
```

`--verbose` gives the real cause, and it is nothing to do with this project,
FUSE, or Tauri. `linuxdeploy` walks `$PATH`; WSL injects the Windows path into
it; it recurses into `/mnt/c/Program Files (x86)/…`, hits `Permission denied`,
and aborts on an uncaught `boost::filesystem::filesystem_error`.

Strip the Windows entries for that command only:

```sh
CLEAN_PATH=$(echo "$PATH" | tr ':' '\n' | grep -v '^/mnt/' | paste -sd:)
env PATH="$CLEAN_PATH" pnpm exec tauri build
```

Twelve entries were stripped on this machine. **Only the AppImage stage walks
`$PATH`** — deb and rpm build either way.

A benign `__TAURI_BUNDLE_TYPE` warning also appears during AppImage bundling. It
does not affect the artifact; nobody needs to chase it.

### Verifying without committing an identifier

Still useful for anyone testing packaging on a branch where the identifier is
not settled — it overrides without touching the tree:

```sh
pnpm exec tauri build --no-bundle --config '{"identifier":"dev.local.synapse-verify"}'
```

That is how the generator removal was confirmed before the identifier existed: a
full release build succeeded, and `libs/backend-api/src/lib/generated/` was
**not** recreated, which any earlier build would have done.

---

## 8. Not done

Listed plainly, so nothing is mistaken for finished.

- **The `darken` fix** — authorised, never begun. §4 has the diagnosis and a
  better fix than the one originally proposed.
- **The `darken` siblings audit** — a read-only scan only; the table in §4 is a
  list of candidates, not a completed audit.
- **DPI, brightness, Chroma effects, battery, polling rate, gaming mode** —
  none wired.
- **DBus confirmations for gaming mode, key rebinding, snap-tap and mouse
  power** — not done. What is already known from introspection: gaming mode
  (`razer.device.led.gamemode`) and polling rate (`razer.device.misc`) exist and
  are cheap; macros exist as `addMacro`/`deleteMacro`/`getMacros`, but ⚠️ that
  is sequence recording and may not be the per-key remapping the UI models —
  worth checking before anyone builds it; **snap-tap has no interface at all**
  on these devices and should not be scheduled as though the protocol were
  there; wireless power saving is really two settings, `setIdleTime` and
  `setLowBatteryThreshold`.
- **Staged DPI** — resolved as impossible: `razer.device.dpi` publishes exactly
  `getDPI`, `maxDPI`, `setDPI` on both mice. Stages would have to be an
  application-level concept stored in our own config, which means they would
  not follow the mouse to another machine.
- **The error-shape unification**, **the `Surface` extraction**, **the CLI
  channel**, **the golden-fixture drift guard**, **the ambience preview
  command** — all designs or agreements, none built.

This page is not registered in the docsite sidebar
(`apps/docsite/.vitepress/config.mts`), matching the other pages added this
round, which are not either.
