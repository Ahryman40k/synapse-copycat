# 0004 — "No devices found" conflates three different situations, and one may fail silently

**Priority: above `0002`**, per the lead — this is the same bug class the
maintainer already hit and half-fixed once (commit `9758133`, "a missing
daemon no longer hides the groups": one refusal was burying an unrelated
answer and taking the whole dashboard down). `getGroups()` got fixed;
`getDevices()`, sitting right next to it in the same file, did not.
**Owner:** `frontend`
**Depends on:** nothing.
**Credit:** found by `ux` during the flows audit (`apps/docsite/design/flows.md`), independently confirmed here by reading `application-store.ts`; copy and the third state below from `ux`'s `apps/docsite/design/capability-states.md`.
**Feature inventory / plan reference:** adds to `features.md` §1/§2; a sibling defect to the pattern `getGroups()` already had to fix.

## The problem

`ux` flagged that "no devices found" on the dashboard reads as one message
covering two very different causes: **no OpenRazer daemon running at all**
vs. **a daemon that's running and honestly has zero devices plugged in**. A
user who's never installed OpenRazer and a user whose keyboard fell off a
USB hub get the same blank tray, with nothing to tell them apart.

Digging into why: `application-store.ts::getDevices()` has **no error
handling at all**:

```ts
async getDevices(): Promise<Device[]> {
	if (!store.sources().chroma) {
		patchState(store, { wired: [] });
		return [];
	}
	const result = await backendApi.invoke('devices', {});
	const devices = result.map(toDevice);
	patchState(store, { wired: devices });
	return devices;
},
```

If there's no daemon, `commands.rs::devices` → `state.backend()` returns
`Err(BackendError::DaemonUnavailable(...))`, and this `invoke` **rejects**.
Nothing here catches it. Compare `getGroups()` in the same file, which
explicitly documents having had this exact class of bug and fixed it with
`Promise.allSettled` plus a `console.warn` fallback — "on a machine with a
light string and no Razer hardware, `unassigned_participants` refused... and
every group command appeared to do nothing." `getDevices()` looks like the
same bug, unfixed.

`devicesResolver` (`app.routes.ts`) calls `getDevices()` and does not catch
either — so an Angular route resolver throwing/rejecting is the actual
runtime behaviour to verify (see "Needs verification" below).

## There are three states, not two — `ux` found the third

`ux`'s `capability-states.md` traced this further: `sources().chroma` being
turned **off** by the user's own choice in Settings is currently
indistinguishable from both of the other two. All three need distinct copy,
not just daemon-vs-empty:

| State              | Cause                                                 | Copy                                                                                                         |
| ------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Turned off         | `sources().chroma` is `false` — the user's own choice | _"Not looking for Razer devices — turned off in Settings."_                                                  |
| Daemon unreachable | `getDevices()` rejects with `DaemonUnavailable`       | _"Could not reach the OpenRazer daemon. Check that it is installed and running."_                            |
| Genuinely none     | The call resolves with an empty list                  | _"No Razer devices found. Looking: Razer Chroma, Twinkly."_ (today's copy — keep it, but only for this case) |

The first row costs nothing new — `sources()` is already read on the settings
page and just needs checking before the empty-tray message renders. Fold
this into the same ticket rather than fixing only the daemon-vs-empty half.

## Why this matters for the stated goal

A user with a light string only and no Razer hardware at all is an explicit,
named scenario the backend already handles gracefully (`features.md` §1: "no
daemon means no Razer devices, not no participants" — fixed for
`groups`/`unassigned_participants`). If `getDevices()` throws uncaught, the
frontend can undo that fix by failing the whole dashboard load for exactly
the household this app is supposed to serve (Twinkly-only, no Razer gear).

## Needs verification before this is scoped precisely

- [ ] Confirm what actually happens today under Tauri with no daemon running: does the dashboard fail to load at all (resolver rejection blocking navigation), load with an unhandled promise rejection in the console but an otherwise-fine (if wrong) UI, or something else? `backend`/`qa` — whoever can most easily run Tauri without `openrazer-fake.sh` started, please confirm and report back so this ticket's acceptance criteria can be tightened.

## Acceptance criteria

- [ ] `getDevices()` catches a rejected `invoke('devices', {})` the same way `getGroups()` does — logs a warning, sets `wired: []`, and does not throw past this method.
- [ ] The dashboard shows all three states above, distinctly, with the copy `ux` specified (table above) — not just "no daemon" vs. "zero devices."
- [ ] A spec (extending `application-store.spec.ts`) exercises `getDevices()` against a rejecting mock and asserts the store ends up in a sane state (`wired: []`, no thrown error) rather than an unhandled rejection.
- [ ] A spec covers the "turned off" state too — `sources().chroma === false` shows its own copy, not the empty-list copy.
- [ ] `qa`: with `openrazer-fake.sh` **not** started (no daemon at all) and Twinkly sources on, confirm the dashboard loads, shows the "daemon unreachable" copy (not the empty-list copy), and still shows any Twinkly participants normally — mirroring the no-daemon Twinkly-only scenario `features.md` §1 already calls out as fixed for groups.
- [ ] `qa`: toggle the Chroma source off in Settings with a daemon actually running and devices actually present; confirm the dashboard shows "turned off" copy, not "no devices found."
