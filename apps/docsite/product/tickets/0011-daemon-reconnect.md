# 0011 — Reconnect to OpenRazer if it starts or restarts after the app

**Owner:** `backend`.
**Depends on:** nothing. Self-contained, no frontend contract change.
**Credit:** found and designed by `backend` during their architecture read-through; policy detailed below is `backend`'s own.
**Feature inventory reference:** adds a row to `features.md` §2/§7.

## The problem

`RazerState::new` tries the daemon **once**, at startup, and
`watch::spawn_razer` gives up permanently if the DBus hotplug subscription
ends (its own comment: "not re-tried until the application is"). So:
installing or starting OpenRazer after the app is running means no Razer
device ever appears without a full app restart, and a daemon that restarts
(e.g. a package upgrade) makes the app go quietly deaf to hotplug from then
on.

## The policy (backend's design)

**Event-driven, not a retry timer** — DBus will tell us, so there's nothing
to poll. Subscribe to `NameOwnerChanged` for `org.razer` on the session bus,
established once at startup regardless of whether the daemon is there yet:

- **Name acquired** → build the backend, store it, re-enumerate, emit
  `devices_changed`, re-subscribe to hotplug, and re-adopt any running group
  now missing a member — `RazerState::adopt` already does exactly this for
  strips appearing late; same code path, reused rather than duplicated.
- **Name lost** → drop the backend and emit `devices_changed` with the Razer
  devices gone. Groups keep their membership and `started` flag: the strips
  in a mixed group keep running, and the Razer members show as
  skipped-with-a-reason — a state the interface already knows how to render.
- No backoff needed — nothing is being retried, there's one subscription.
- The backend moves behind an `RwLock<Option<Arc<dyn DeviceBackend>>>` on the
  façade. Read-mostly, so contention isn't a concern.

## Acceptance criteria (all reproducible with the fake daemon)

- [ ] Start the app with no daemon → window opens, groups visible, no Razer devices, `DaemonUnavailable` reported rather than an empty list (already covered by `tests/no_daemon.rs` — must stay true, not regress).
- [ ] With the app running, `openrazer-fake.sh start` → devices appear **without restarting the app**, via a `devices_changed` event carrying them.
- [ ] With the app running and a mixed group drawing, `openrazer-fake.sh stop` → the app survives, the strips in that group keep drawing, and the Razer members report as skipped with a reason.
- [ ] `stop` then `start` again → devices come back and a group that was running is genuinely drawing on them again, not merely listed as members.
- [ ] Restarting the daemon twice in a row does not leave two hotplug subscriptions — devices appear once per change, not twice. (Flagged by `backend` as the criterion most likely to catch an implementation mistake — don't skip it.)
- [ ] `qa`: run through all five as a manual pass against `openrazer-fake.sh start`/`stop` cycles — this is the kind of thing easy to get right in a unit test and still feel wrong in the actual running app (timing, whether the dashboard updates live vs. needs a manual refresh).
