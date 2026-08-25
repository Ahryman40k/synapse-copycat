# 0012 — A first run never writes its groups to disk

**Owner:** `backend`.
**Depends on:** nothing. Small.
**Credit:** found by `backend` while writing the test for the quit-fix (0-lit-devices, now resolved).
**Feature inventory reference:** a small addendum to `features.md` §1's persistence row.

## The problem

`RazerState::new` builds the "everything found, one group, drawing" default
on a first run entirely in memory and persists nothing until the user
changes something (`with_groups`/`persist` only runs on a mutation). So:
first run → quit → relaunch is **another first run** — the group looks
identical (same devices, same still-green default) so it's easy to miss,
but `next_id` also doesn't survive, and if the user had renamed or restarted
the group before quitting on that very first session, that's the change that
would be lost — the default state underneath it was never actually saved.

## Why it matters

The saved-state guarantee ("what a restart would restore," `features.md`
§1) has a hole on exactly the path every new user takes. It's currently
invisible because the re-derived default looks the same as what was there —
but it means the _first_ session's choices are never durable until a second
change happens to trigger a save.

## Acceptance criteria

- [ ] The first-run default group is written to disk immediately after being constructed, not only on the next mutation.
- [ ] `next_id` survives a quit-and-relaunch immediately after a first run, even with zero user changes made.
- [ ] A test (extending `tests/state_engine.rs`) pins this: first run, immediately quit (no changes), relaunch, assert the persisted file exists and the group/`next_id` match what a "no-op" restart should preserve.
- [ ] No regression to the "a broken file is not silently replaced" behaviour (`tests/state_engine.rs::a_broken_file_is_not_silently_replaced`).
- [ ] `qa`: not required to manually verify (this is fully covered by an automated Rust test) — flagging for awareness only, no action needed unless the automated coverage above is missing when this ships.
