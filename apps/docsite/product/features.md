# Feature inventory

What the application actually does, as read from the code on `10-integrate-ai`
on 2026-08-25 — not from what it is meant to become. This is the reference for
every ticket: a ticket that adds to a row here should point at it, and a
ticket that changes behaviour should update the row when it lands.

**Definition of done for the whole effort** (per the maintainer): a Tauri
application that runs on Linux and manages light ambience in a room across
Razer Chroma and Twinkly devices, plus a QA report confirming it works.
Everything below is scored against that, not against "does something happen
on screen."

## How to read the status columns

| Mode              | What it means                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| **Browser/mock**  | `pnpm exec nx serve synapse`, `provideBackendApi(withMock(…))`. No Tauri, no daemon.                         |
| **Tauri + fake**  | `nx run synapse:tauri` with `openrazer-fake.sh start`. Real Rust backend, real DBus, invented sysfs devices. |
| **Real hardware** | Tauri against the distribution's own OpenRazer daemon and/or a real Twinkly on the LAN.                      |

- ✅ **Works** — wired end to end, and (for Rust-side logic) has an automated test exercising it.
- ⚠️ **Partial** — wired, but with a caveat given in the notes (unverified on real hardware, a placeholder value, a design gap).
- ❌ **Not wired** — the control exists on screen and does nothing past the interface's own state; nothing crosses the IPC boundary.
- — **N/A** — the mode cannot exhibit this (e.g. a hardware-only fault path in the browser).

---

## 1. Groups and the ambience engine — the core feature

This is the one thing in the application that is fully wired, tested on both
ends, and matches the product's actual goal. Everything else is either
supporting cast (discovery, wallpapers, theming) or a legacy stub (§5).

**Model.** A _group_ is a set of _participants_ (a Razer serial, or
`twinkly-<mac>`) and one _ambience_ across them. A participant belongs to at
most one group — enforced by the backend, not merely by convention. An
ambience is three independently-authored channels — **colour** (fixed /
rainbow / palette), **motion** (none / wave / pulse), **brightness** (fixed /
circadian) — composed as `pixel = colour × motion × brightness`, so a
wallpaper's hue, a wave's movement and the hour's dimming never have to
arbitrate with each other.
Code: `apps/synapse/src-tauri/src/razer/engine/{ambience,group,painter,frame,cadence,runner}.rs`,
`libs/backend-api/src/lib/models/{ambience,group}.ts`,
`apps/synapse/src/app/core/components/{ambience-panel,ambience-preview,group-card}`.

| Feature                                                                           | Browser/mock                 | Tauri + fake | Real hardware | Notes                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------- | ---------------------------- | ------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enumerate Razer devices (`devices`)                                               | ✅                           | ✅           | ✅            | `commands.rs::devices`, tested against real DBus in `tests/dbus_backend.rs`.                                                                                                                                                                      |
| Discover Twinkly strips on the LAN (`twinkly_devices`)                            | ✅ (invented)                | ✅           | ⚠️            | UDP broadcast + 2s listen window, `libs/twinkly/src/discovery.rs`. Unverified against a real `TWS050STQ` per `apps/docsite/features/index.md`; ask `backend`/`qa` for hardware verification status.                                               |
| Create / rename / remove a group                                                  | ✅                           | ✅           | ✅            | `create_group`/`rename_group`/`remove_group`; `tests/state_engine.rs`, `tests/groups.rs`. Removal has a confirm step on the card (`group-card.ts`).                                                                                               |
| A participant belongs to at most one group                                        | ✅                           | ✅           | ✅            | Backend refuses with `alreadyTaken`, naming the holder; `application-store.ts::moveParticipant` releases-then-adds so a legitimate move never trips it.                                                                                           |
| Move a participant between groups, by drag                                        | ✅                           | ✅           | ✅            | Angular CDK drag-drop, `dashboard-page.ts`.                                                                                                                                                                                                       |
| Move a participant between groups, without a pointer                              | ✅                           | ✅           | ✅            | Pick-up/put-down button pair, same component — the accessibility path for the drag above.                                                                                                                                                         |
| Author an ambience (colour/motion/brightness) and preview it live                 | ✅                           | ✅           | ✅            | Preview is computed client-side (`ambience-panel.ts`, `@synapse-copycat/backend-api` compositor) — works with zero devices connected.                                                                                                             |
| Push an ambience change to a **running** group                                    | ✅ (mock)                    | ✅           | ✅            | Takes effect without a restart — `set_group_ambience`, `tests/groups.rs::changing_a_running_group_takes_effect_without_a_restart`.                                                                                                                |
| Change a group's cadence (slow/normal/fast)                                       | ✅                           | ✅           | ✅            | Applies on next start, not live — `tests/groups.rs::each_group_keeps_its_own_cadence`.                                                                                                                                                            |
| Start / stop a group                                                              | ✅                           | ✅           | ✅            | Stopping keeps the last frame; devices don't go dark by themselves.                                                                                                                                                                               |
| Paint a device's LED matrix, dirty-rows-only                                      | —                            | ✅           | ✅            | `painter.rs`; `tests/painter.rs` covers whole-frame-first, dirty-row-only thereafter, and shape mismatches refused before the wire.                                                                                                               |
| Approximate an ambience on a device with no matrix (headset, single-LED mousemat) | —                            | ✅           | ✅            | Reports "one colour" rather than failing — `Canvas::EffectsOnly`.                                                                                                                                                                                 |
| Per-device achieved rate, shown honestly when a device can't keep up              | ⚠️ (no live devices to pace) | ✅           | ✅            | `tests/engine.rs::reports_what_each_device_costs`; figures only refresh on reload today (see gap below), not live.                                                                                                                                |
| Groups survive a restart                                                          | —                            | ✅           | ✅            | Written to disk on every change (`razer/persistence.rs`), reloaded at startup; `tests/state_engine.rs::what_was_running_is_running_again_after_a_restart`.                                                                                        |
| First run: everything found goes into one drawing group                           | —                            | ✅           | ✅            | `RazerState::initial_conductor`; the app does something the moment it opens.                                                                                                                                                                      |
| Works with zero Razer hardware and a light string only                            | —                            | ✅           | ⚠️ untested   | `unassigned_participants`/`groups` no longer refuse when there's no daemon (`razer/state.rs::unassigned` doc comment) — this was a real bug, now fixed and covered. Not yet confirmed on a machine with literally no OpenRazer package installed. |
| A strip that joins the network _after_ its group started gets adopted             | —                            | ✅           | ⚠️            | `RazerState::adopt`, called every 15s Twinkly sweep. Blinks already-running members — documented trade-off.                                                                                                                                       |
| Live figures refresh without a reload                                             | ❌                           | ❌           | ❌            | Known gap, called out in `apps/docsite/features/index.md`. `GroupStatus` is only re-read after a command; nothing polls while idle.                                                                                                               |

---

## 2. Devices and discovery

| Feature                                                 | Browser/mock | Tauri + fake | Real hardware | Notes                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------- | ------------ | ------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Device list follows hotplug (Razer)                     | —            | ✅           | ⚠️            | DBus signal forwarding, `watch.rs::spawn_razer`, 300ms settle so a wireless receiver's burst becomes one enumeration. One subscription at startup; a daemon that restarts is not re-subscribed without relaunching the app.                                                                 |
| Device list follows Twinkly appearing/leaving           | —            | ✅           | ⚠️            | 15s poll while the Twinkly source switch is on; gated so it never sweeps a network the user asked it not to.                                                                                                                                                                                |
| Turn a discovery source on/off (Chroma, Twinkly)        | ✅           | ✅           | ✅            | `sources-panel.ts`, persisted to `localStorage`, backend half is `watch_twinkly`.                                                                                                                                                                                                           |
| Govee as a source                                       | ❌ deferred  | ❌ deferred  | ❌ deferred   | **Explicitly out of scope this round** — see §6. The switch exists, shown disabled with "Not implemented yet," not hidden.                                                                                                                                                                  |
| Inspect one participant (device + group + live status)  | ✅           | ✅           | ✅            | `device-dialog.ts`, opened from a tile on the dashboard.                                                                                                                                                                                                                                    |
| The application's own theme colour follows the hardware | ✅           | ✅           | ✅            | Fully client-side — `ambience-theme.ts` reads the **first** group's colour channel (hue/chroma only, never lightness) and republishes CSS variables via `ThemeService`. Which group wins when several run different colours is an open product question (comment in the source), not a bug. |

---

## 3. Wallpapers and palette-driven ambience

The newest landed feature (`d80485a`, `939328a` in the recent log).
Code: `apps/synapse/src-tauri/src/wallpapers.rs`, `libs/palette`, `libs/wallpaper`,
`apps/synapse/src/app/domains/backgrounds-page`, `core/stores/wallpapers-store.ts`.

| Feature                                                                         | Browser/mock     | Tauri + fake | Real hardware | Notes                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------- | ---------------- | ------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pick a folder of wallpapers (native dialog)                                     | ✅ (mocked path) | ✅           | ✅            | `choose_wallpaper_folder`, remembered in `localStorage` between runs.                                                                                                                                                                      |
| List a folder's images with thumbnail + extracted palette                       | ✅               | ✅           | ✅            | `libs/palette/src/extract.rs` — OKLab-space clustering, sampled at 96px wide; thumbnail is a 192px `data:` URI (works identically in-browser and in-webview, since the webview can't be handed an arbitrary filesystem path).              |
| Apply a wallpaper's palette to a group's ambience                               | ✅               | ✅           | ✅            | `backgrounds-page.ts::apply` → `setGroupAmbience` with a `palette` colour source, held still (no drift) since the mapping to the picture is the point.                                                                                     |
| Detect which desktop's wallpaper-setter this machine has                        | ✅ (mocked list) | ✅           | ⚠️            | `libs/wallpaper/src/setters.rs`: GNOME, KDE, XFCE, swww, Hyprpaper, feh, tried in that order. An **empty list is a real, honestly-shown answer** on a desktop none of them know.                                                           |
| Actually set the desktop wallpaper                                              | ✅ (mocked)      | ✅           | ⚠️ untested   | `set_wallpaper`; reports which setter did it, or refuses by name when none can. Not yet confirmed against a live GNOME/KDE/Hyprland session per the code's own doc comments — worth a `qa` pass on whatever desktop the test machine runs. |
| Wallpaper's colours feed the **lighting only**, not the desktop, in one gesture | ✅               | ✅           | ✅            | Deliberately two separate actions (`apply` vs `setWallpaper`) — the page says so rather than silently doing half a job.                                                                                                                    |

---

## 4. External control — MCP server

`apps/synapse/src-tauri/src/mcp/mod.rs`. An MCP server bound to `127.0.0.1:8730`,
inside the same process as the window, sharing the same `RazerState` — so a
change made by an assistant is immediately visible in the window and vice
versa. **This is in scope for the stated goal** (a Linux app that manages room
ambience) if "an assistant can drive it" is part of what "manages" means for
this team — flag to the lead if that's not the intent, otherwise it's a
functioning feature worth a QA pass of its own.

| Feature                                             | Browser/mock    | Tauri + fake    | Real hardware   | Notes                                                                                |
| --------------------------------------------------- | --------------- | --------------- | --------------- | ------------------------------------------------------------------------------------ |
| `list_groups`, `list_unassigned`                    | —               | ✅              | ✅              | Same command as the window uses — `RazerState` methods, not a second implementation. |
| `create_group`, `remove_group`, `set_group_members` | —               | ✅              | ✅              | Tested: `every_tool_is_registered_and_described` in `mcp/mod.rs`.                    |
| `set_group_colour` (`#rrggbb` only)                 | —               | ✅              | ✅              | Refuses anything not `#rrggbb` rather than guessing — tested.                        |
| `start_group`, `stop_group`                         | —               | ✅              | ✅              |                                                                                      |
| Reachable outside this machine                      | — N/A by design | — N/A by design | — N/A by design | Bound to loopback deliberately — no auth story exists, and none is attempted.        |

---

## 5. Per-device pages — legacy Razer-Synapse-style UI, still not wired

**Maintainer decision: wire every one of these for real** (not hide, not
ship inert). Scoped as `plan.md`'s Track B, capability discovery (`0006`)
built and ready — **but work stopped before any individual control was
wired.** Every status below except battery/DPI/brightness/effects being
"frontend-only, no new Rust" is still accurate as a plan; none of it is
built. See `plan.md`'s ticket index for exactly what was scoped vs. never
started. `frontend`'s exhaustive control-by-control
read (superseding the earlier draft table here) reframes the size of the
work: **most of it is frontend-only**, not a new Rust contract. `run_capability`
already routes and dispatches `GetDpi`/`SetDpi`/`GetMaxDpi`,
`GetBrightness`/`SetBrightness`, all four `SetChroma*` effects, and
`GetBatteryLevel`/`IsCharging` — the frontend's own `CapabilityRequest`
union just never declared them. Capability discovery (`0006`) is now built,
confirming devices genuinely differ at the _method_ level (a Basilisk
Ultimate has no chroma effects at all; a Kraken has no brightness; two
otherwise-identical mice differ on polling rate) — so wiring has to consult
discovery per participant, not assume every device of a kind matches.

**A — reaches real hardware today.** Groups (create/rename/membership/
ambience/cadence/start/stop/remove), the strip page (power + colour, over
`run_capability` → HTTP), backgrounds (folder/palette/wallpaper-set),
sources switches (Chroma/Twinkly), and the device dialog's live status
line. Nothing to do here.

**B — writes nowhere today, but the Rust capability already exists**, and
is **frontend-only work** — `run_capability` already routes and dispatches
all of these; re-owned off `backend` per the lead once this became clear:

| Control                                              | Where it stops today                                                      | Ticket                                                                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Lighting → effect + settings, all three device kinds | `ApplicationStore.lighting`, memory only                                  | `0009` (frontend-only)                                                                                                            |
| Lighting → brightness, all three                     | same                                                                      | `0008` (frontend-only)                                                                                                            |
| Lighting → "apply to all devices"                    | frontend-only rule over the above two                                     | `0008`/`0009`                                                                                                                     |
| Mouse → performance → DPI, single value              | component `model()`, **lost on tab switch**                               | `0007a` (frontend-only) — staging kept, re-scoped as app-owned state, see below                                                   |
| Mouse → performance → DPI, staged switching          | never existed on the wire at all — an app-level concept, not a device one | `0007a` (list) / `0007b` (button-bound cycling, blocked on feasibility)                                                           |
| Mouse → performance → polling rate                   | same                                                                      | `0017` (two real mice already differ on this — a live discovery example)                                                          |
| Mouse → power → sleep-after, low-power threshold     | `model()`, lost on tab switch                                             | `0021` — confirmed cheap, `getIdleTime`/`setIdleTime` + `getLowBatteryThreshold`/`setLowBatteryThreshold` on `razer.device.power` |
| Mouse → battery gauge                                | **hardcoded `62%`, always** — an active misinformation, not an absence    | `0010`, P0                                                                                                                        |

**C — writes nowhere, and the answer needs more research or a backend spike
before it can be ticketed like B:**

| Control                                                                    | Where it stops today                               | Note                                                                                                                                                                  |
| -------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keyboard → gaming mode                                                     | not even bound to its section, panel-internal only | `0018` — `getGameMode`/`setGameMode` confirmed on `razer.device.led.gamemode`, but the panel has six switches to one capability's shape — mismatch to resolve first   |
| Mouse/keyboard → key/button rebinding, 2 layers                            | component `model()`, lost on tab switch            | `0019` — `razer.device.macro` confirmed present, but `backend` won't promise it's the right concept (remapping vs. sequence-recording) without a payload-format spike |
| Keyboard → snap-tap                                                        | component-internal                                 | **Confirmed absent** by `backend` — no interface for it on any of the four fixture devices checked. Not schedulable this round; likely needs newer hardware/daemon.   |
| Camera → image panel (preset/brightness/contrast/saturation/white balance) | `model()`                                          | not a Razer capability question at all — the Kiyo's actual image pipeline, if OpenRazer even exposes it, is unresearched                                              |

**D — special cases, each with its own resolution:**

| Item                                                | Resolution                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Switch off lighting when display turns off"        | **Awaiting maintainer decision** (`0015`) — component class is empty, checkbox has zero binding, not even to memory. `po`/`ux` both recommend removal, but deleting user-visible UI turned out to be the maintainer's tier of call, the same as the original hide-vs-wire decision on these five pages — not something to resolve by ticket. |
| Settings → language                                 | Kept as an honest placeholder — "recorded, not yet acted on" per its own comment, `'en'` only. No translation infrastructure exists. Not a defect, matches the Govee pattern.                                                                                                                                                                |
| Studio page / Backgrounds page                      | **On hold, pending redesign.** The maintainer has directed `ux` to focus on background-management flows first, then the effect studio, calling the current flow "not very useful." Do not write implementation tickets against either route until `ux` reports back — this may be a concept change, not a polish pass.                       |
| Per-device section memory (which tab was last open) | Correctly store-only — this is UI state, not a device setting. Not a defect; noted so nobody "fixes" it.                                                                                                                                                                                                                                     |
| Camera preview toggle + autofocus                   | The **preview** is real (browser `getUserMedia`, works today) — autofocus is a real Razer Kiyo control and unresearched, in the same bucket as C's other camera-panel items.                                                                                                                                                                 |

**Cross-cutting defect found while wiring, not before, now ticketed as
`0020` and scheduled ahead of `0007a`:** every `model()` control in B and C
loses its value when you switch device tabs, because the device pages
render their sections through `ngComponentOutlet`, passing only `device` as
input — no state persistence across the outlet swap. Fixed now rather than
once Track B/C settles, per the lead — otherwise it will be misdiagnosed as
a bug in whichever wiring ticket ships next.

**UI pattern for "this device can't do that":** `apps/docsite/design/capability-states.md`
(structural absence → omit; transient absence → disabled with a reason;
a device's own Lighting tab defers to its group whenever it's in one,
running or stopped) is the design authority for every Track B/C ticket —
`sources-panel`'s disabled-Govee-switch is the existing precedent it
generalises from.

---

## 6. Sources / settings

| Feature                                          | Browser/mock           | Tauri + fake           | Real hardware          | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------ | ---------------------- | ---------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toggle Chroma discovery                          | ✅                     | ✅                     | ✅                     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Toggle Twinkly discovery                         | ✅                     | ✅                     | ✅                     | Backend half (`watch_twinkly`) is idempotent — safe to re-assert every launch.                                                                                                                                                                                                                                                                                                                                                                                                           |
| Govee toggle                                     | ✅ _(shown, disabled)_ | ✅ _(shown, disabled)_ | ✅ _(shown, disabled)_ | **Deferred, not broken.** `core/models/source.ts`: `SOURCES_UNAVAILABLE = ['govee']`, detail text reads "Not implemented yet." Reason for deferral: the user's Govee devices don't answer on the LAN, are believed Bluetooth, and this machine has no Bluetooth adapter to test against — recorded here per the lead's instruction, not investigated further this round. The product is already honest about this; no ticket needed unless the toggle's copy or placement needs UX work. |
| Language setting                                 | ✅                     | ✅                     | ✅                     | Only `'en'` exists. Recorded as a preference, not acted on — there's no `@angular/localize` wiring and no message files. Not persisted across restarts (in-memory `ApplicationState` only).                                                                                                                                                                                                                                                                                              |
| About panel                                      | ✅                     | ✅                     | ✅                     | Project URL only. No version shown — deliberately: neither `tauri.conf.json`'s version nor `package.json`'s reaches the browser bundle, and the source comment says a wrong number is worse than none.                                                                                                                                                                                                                                                                                   |
| `modules` command / dashboard "modules" resolver | — removed              | — removed              | — removed              | **Fixed.** `0001` shipped: the caller, the resolver, the `BackendCommands` entry, every mock, the `Module` type (and its `'goove'` typo), and the dashboard's Modules section are all gone. Also fixed the same crash's browser-reproducible symptom (`ux`'s `NG04002` finding) and, as a side effect, removed the app bar's overflow-menu machinery, which existed only to serve module entries — documented in `appbar.ts` for whoever needs a data-driven, overflowing entry again.   |

---

## 7. Application lifecycle (Tauri only — no mock/browser equivalent)

| Feature                                                               | Tauri + fake  | Real hardware | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------- | ------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Closing the window hides it; the engine keeps running                 | ✅            | ✅            | `lifecycle.rs` — "an ambience that stops when the window closes is not an ambience, it is a preview."                                                                                                                                                                                                                                                                                                                                                                                         |
| Quit darkens every device before the process exits                    | ✅            | ✅            | **Fixed** (was a live defect — `stop_all` documented as the real-quit path, had no caller, every device stayed lit after Quit). Bounded by a 5s timeout so a wedged daemon/departed strip can't make Quit look broken. `tests/state_engine.rs` pins that groups keep `started` and nothing is saved on quit, so the same ambience resumes on relaunch.                                                                                                                                        |
| Darkening a device on stop/quit works regardless of what it publishes | ❌ still live | ❌ still live | **Half of this bug was already fixed** (Twinkly, `e58d3ca`); the other half — `darken` hardcoding `SetChromaStatic` for every non-Twinkly participant — is still live on any device that doesn't publish it (confirmed: the Basilisk Ultimate). Ticketed as `0014`, authorised P0, work stopped before `backend` could start it. A better fix than the ticket's own was found before standing down — see `plan.md` — don't rebuild the ticket's original approach without reading that first. |
| System tray (Show / Quit)                                             | ⚠️            | ⚠️            | Present, but the module's own comment notes Hyprland and other tiling compositors have no tray unless something like Waybar implements StatusNotifierItem — worth a `qa` check on whatever compositor the test machine runs.                                                                                                                                                                                                                                                                  |
| Relaunching the binary reveals the running instance                   | ✅            | ✅            | Single-instance plugin, registered first.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| A missing OpenRazer daemon never blocks the window from opening       | ✅            | ✅            | `RazerState::new()` never fails; carries the reason and surfaces it per-command. `tests/no_daemon.rs`.                                                                                                                                                                                                                                                                                                                                                                                        |
| Reconnecting to a daemon that starts/restarts after the app           | ❌            | ❌            | Tried once at startup only; hotplug subscription gives up permanently if it ends. Ticketed as `0011`.                                                                                                                                                                                                                                                                                                                                                                                         |
| First run persists its default group immediately                      | ❌            | ❌            | Built in memory, not written to disk until the first _mutation_ — a quit with zero changes loses nothing visible today but the guarantee has a hole. Ticketed as `0012`.                                                                                                                                                                                                                                                                                                                      |

---

## 8. Known product/UX problems

**Correction (2026-08-25, later):** the two problems originally listed here —
"no way to delete a group from every path" and "dragging has no keyboard
equivalent" — were stale. The lead had passed them on from earlier session
history without re-checking; both are already fixed and were confirmed fixed
by reading the code (which is why the entries below already said so). Group
removal was fixed in commit `4983979` ("a group can be removed from the card
that shows it") — `group-card.html` has a confirm-then-remove button. The
keyboard-equivalent drag is documented in CLAUDE.md §4 and implemented in
`dashboard-page.ts` (`onPickUp`/`onDroppedInto`, the `carried` signal).
**Dropped as tickets.** This does not close accessibility as a topic — a
_new_, concretely-repro'd pointer-only gap is still a real ticket; it just
isn't either of these two.

Two new, real findings from `ux`'s flows audit (`apps/docsite/design/flows.md`),
ticketed:

- **Per-device controls (DPI, macros, key rebinding, lighting effects) write
  to nothing but Angular state** — the same finding as §5 below, reached
  independently by `ux` via a grep of `apps/synapse/src/app/domains/devices/**`.
  A user remaps a key and sees it "work" with zero indication it never
  reached the hardware. Folded into the §5 team decision.
- **`getDevices()` has no error handling**, unlike `getGroups()` (which was
  fixed for exactly this class of bug) — a missing daemon can fail silently
  or block the dashboard resolver rather than reporting "no daemon" as a
  distinct, honest state from "daemon present, zero devices." Ticketed as
  `0004-no-daemon-devices-fail-silently.md`.

Still open:

- **Live achieved-rate figures don't refresh without a reload** (§1, last row) — ticketed as `0002`, never started.
- ~~`modules` command is broken under Tauri~~ — **fixed**, see §6.

Three more, from `ux`'s backgrounds-flow redesign (`apps/docsite/design/backgrounds-flow.md`), found while this document was being finalised — not ticketed, per the stand-down, but real and worth carrying forward:

- **A wallpaper's palette applied to a group is mislabelled "Rainbow"** in the group card's summary line — the live preview is correct, only the text is wrong. The smallest, most clear-cut fix in this whole document; `ux`'s own words were that they'd ship it immediately regardless of anything else.
- **No way to tell which wallpaper is currently browsed vs. currently lighting a group** — same visual state serves both.
- **`/backgrounds` has no resolver of its own** — a fresh load or refresh can't find any groups, though in-app navigation (via `/dashboard`) works fine.

See `open-decisions.md` §7 for the full writeup.

---

## Source map, for anyone extending this document

- Backend entry points: `apps/synapse/src-tauri/src/commands.rs` (IPC surface), `razer/state.rs` (façade every channel goes through), `mcp/mod.rs` (assistant surface).
- Engine: `razer/engine/{ambience,group,painter,frame,cadence,runner}.rs`.
- Protocol libraries: `libs/openrazer` (Chroma, DBus/REST), `libs/twinkly` (UDP discovery + HTTP), `libs/palette` (image → colours), `libs/wallpaper` (desktop setters).
- Frontend contract: `libs/backend-api/src/lib/models/*.ts`, mock at `models/mock*.ts`.
- Frontend features: `apps/synapse/src/app/domains/{dashboard-page,studio-page,backgrounds-page,settings-page,devices}`, `core/components/*`, `core/stores/*`.
