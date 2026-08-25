# 0010 — Wire the battery gauge (mouse page)

**Track B, capability ticket.**
**Owner:** `frontend` only. **Re-owned per the lead**: `run_capability`
already routes and dispatches `GetBatteryLevel`/`IsCharging` in Rust —
`backend` should not build this.
**Depends on:** `0006-capability-discovery.md` — **done**, ready to build against.
**Priority: P0, authorised by the lead to be `frontend`'s next task, above
everything else in Track B.** This is not merely unwired, it's an **active
misinformation**: `mouse-page.ts` hardcodes `{ level: 62, charging: false }`
for every mouse, forever, and a user reading it is being told something
false rather than shown nothing. The lead's framing: "a control that does
nothing disappoints the user; a readout that states a false fact
misinforms them, and they have no way to discover it is wrong." Everything
else in the inventory under-delivers; this one lies.
**Feature inventory reference:** `features.md` §5, "Battery gauge on the mouse page"; `GetBatteryLevel`/`IsCharging` already implemented and tested in `libs/openrazer`.

## The problem

`mouse-page.ts`:

```ts
protected readonly battery = signal<{ level: number; charging: boolean } | undefined>(
	{ level: 62, charging: false },
);
```

A hardcoded stand-in, explicitly flagged in its own comment as "here to make
the gauge visible while the plumbing is missing." The plumbing now exists on
the Rust side (`GetBatteryLevel`, `IsCharging`) and is untested by nothing
past `dbus_backend.rs`.

## Scope

- A new `BackendCommands`/`CapabilityRequest` pair (or reuse of
  `run_capability` if a `GetBattery` combining both reads makes more sense —
  `backend`'s call) that answers level + charging together, since the UI
  wants both at once.
- `mouse-page.ts` reads the real value on open, replacing the hardcoded signal.
- A device with no battery (wired mice, most peripherals) does not show a gauge at all — this is the direct case for discovery (0006): "no battery" isn't an error state, it's the normal case for a wired device.
- Consider whether this needs to be a one-shot read on page open or something periodically refreshed — a mouse's battery level changing while its page is open is plausible over a long session; a poll interval (if any) should be cheap and stop when the page isn't open. (Same class of concern as ticket 0002's live-status-refresh discussion — worth reading that ticket for the poll-vs-push reasoning before deciding here.)

## Acceptance criteria

- [ ] The battery gauge shows the real level/charging state from a fake or real wireless device, not the hardcoded `62%`.
- [ ] A device discovery (0006) reports as having no battery shows no gauge — confirm this isn't just "shows 0%," which would read as a fault. This is the structural-absence case from `apps/docsite/design/capability-states.md` — omitted, not disabled.
- [ ] A battery-having device that's momentarily unreachable (daemon dropped, device out of range) shows the gauge disabled with a stated reason — the transient-absence case from the same document — rather than reverting to the old hardcoded value or disappearing.
- [ ] Wire schema follows root `AGENTS.md` §6.
- [ ] `nx test synapse backend-api` pass; `cargo test`/`cargo clippy` clean.
- [ ] `qa`: verify against the fake daemon's reported battery level/charging state matches what the gauge shows; verify a wired device (or whatever the fake daemon models as battery-less) shows no gauge.
