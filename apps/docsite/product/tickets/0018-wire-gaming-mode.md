# 0018 — Wire gaming mode (keyboard → customize)

**Status: never started (stand-down). Scope corrected by `ux` after the last
update to this ticket — read this before resuming, the "six switches vs.
one capability" framing below is superseded.**
**Owner (when resumed):** `backend` (Rust, to confirm the open question
first) + `frontend` (UI + contract).
**Depends on:** `0006-capability-discovery.md` — done. `backend` confirmed
`razer.device.led.gamemode` with `getGameMode`/`setGameMode` on the
Huntsman and the Tartarus.

## Corrected understanding (`ux`, after checking `gaming-mode-panel.ts` directly)

**There is no six-switches-vs-one-capability mismatch to resolve.** The
component's own comment already says the six switches are read and written
as **one object**, anticipating a single combined backend request — that
part was already right.

**The real open question is different: at most one of the six switches is
plausibly a device capability at all.**

- `disableWindowsKey` is a real Razer firmware feature on some keyboards
  (hardware-level Windows-key lockout) — OpenRazer could plausibly expose
  this, and it's the one worth checking against the daemon.
- `inGameOnly`, `disableMenuKey`, `disableAltTab`, `disableAltF4` are
  **OS-level global-shortcut suppression** — not something a peripheral's
  firmware does or that OpenRazer's DBus surface could expose. Implementing
  these would mean this application hooking OS/compositor shortcuts
  directly, an entirely different engineering effort from calling a
  capability.

`ux` found **zero references to gaming mode anywhere in `libs/openrazer`**
— consistent with either "not wired yet" or "never applicable," and the
code alone can't distinguish which. This needs the same kind of direct
daemon probe the lead ran for DPI staging and polling rate: does
`disableWindowsKey` specifically answer to anything on the real DBus
surface? That probe was never run before the stand-down.

## Once that's answered

Per `ux`'s `disabled-state-patterns.md` scale rule: if `disableWindowsKey`
is real, it gets its own switch, capability-gated normally like every other
Track B control. The other four get **one shared header-level note**, worded
to say plainly that this isn't a "your keyboard doesn't support it yet"
case — it's "this needs building at the OS level, not the device level."
Conflating the two would send someone hunting for a firmware update that
will never help. `ux` will write the exact line once the probe answer is in.

## Acceptance criteria (unchanged in substance, corrected in scope)

- [ ] The `disableWindowsKey`-vs-daemon question above is answered by a direct probe before any UI or Rust work starts.
- [ ] If real: `getGameMode`/`setGameMode` mapped to `CapabilityRequest` variants per the `new-tauri-capability` skill; the switch reads the device's actual state on open and writes changes back; a keyboard discovery reports as lacking it doesn't show the switch (structural-absence pattern).
- [ ] The other four switches get the shared "OS-level, not device-level" disclosure `ux` will word, not left implying they're capability-gated the same way.
- [ ] `frontend`: bind the panel to `keyboard-customize.ts` — confirmed today it has no binding at all, panel-internal only, independent of the backend question above.
- [ ] `qa`: verify against the fake daemon's keypad fixture — confirm a `disableWindowsKey` change (if real) is reflected in a subsequent read.
