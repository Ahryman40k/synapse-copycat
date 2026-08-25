# 0006 — Capability discovery: the UI knows what a device can do

**Status: built by `backend`, in the tree, not committed.** Every later
Track B control ticket now unblocks. `frontend` consumes the contract below.
**Owner:** `backend` (done) → `frontend` (consumes).
**Feature inventory reference:** `features.md` §5.

## What shipped

`capabilities(participant) -> string[]`. The strings are the exact `type`
names `run_capability` already takes, so a control checks for the literal
string it would send — one vocabulary, no separate mapping table on the
frontend.

**Discovered per DBus _method_, not per interface** — this is the answer to
the open question this ticket started with, and it mattered: interface
presence alone is not sufficient. Real output from the fake daemon, across
four devices:

- **Goliathus** — has chroma, but no `wave` specifically (same interface as the Huntsman, one effect missing).
- **Kraken** — no brightness at all.
- **Basilisk Ultimate** — DPI and battery, **no chroma effects whatsoever** (its colour is per-zone; "no colour control" is the correct answer for this mouse, not a bug).
- Two mice of the same _interface set_ can still differ on `getPollRate`/`setPollRate` specifically (one mouse has it, the other doesn't, though both expose `razer.device.misc`).

An interfaces-only check would have offered controls that fail with
`UnknownMethod` on first use — worse than the inert page being replaced,
because the user has already tried by the time it fails.

**Two behaviours that must stay distinct, both now `qa` criteria below**: an
empty capability array means "supports nothing"; an unreachable device
_throws_ rather than returning empty. Conflating them would greyed-out a
device that's simply offline the same way as one that genuinely lacks
everything. And discovery is keyed per **participant**, not per device
_kind_ — two mice of the same model can differ.

**Drift guard, worth knowing about**: adding a capability to the Rust
routing table without adding it to the discovery catalogue now fails either
the build (an exhaustive match) or a test — closing the "capability exists
but discovery never reports it" failure mode before it can ship silently.

## A defect this surfaced, not yet fixed — candidate ticket `0014`

`RazerState::darken` calls `set_chroma_static` for every non-Twinkly
participant unconditionally. The Basilisk Ultimate doesn't publish that
method, so darkening it (joining a stopped group, quitting) silently does
nothing — best-effort code with no error surfaced. See `0014`.

## Acceptance criteria

- [x] The frontend has a way to know, per connected device, which capabilities it actually supports, discovered at method granularity.
- [x] A capability the device does not support is never presented as available (empty/absent from the list).
- [x] An unreachable device is distinguishable from one that supports nothing (throws vs. empty array).
- [x] Discovery is per-participant, not per-device-kind.
- [x] Adding a capability without registering it in the discovery catalogue fails a build or a test, not silently ships.
- [ ] `frontend`: consumes the contract — `capabilities()` call wired into the device dialog, run once on open (per `ux`'s `capability-states.md`, a single upfront query, not lazy per-control probes), and used to shape which tabs/rows render at all.
- [ ] `frontend`: mock has an equivalent per invented fixture device, so mock-first development isn't broken for every ticket that follows.
- [ ] `qa`: verify the four real-device examples above against the fake daemon (Goliathus without wave, Kraken without brightness, Basilisk without any chroma effect) — confirm the UI's tab/row shape actually matches, not just that a request returns something.
- [ ] `qa`: confirm an unreachable device's UI state differs visibly from a reachable-but-capability-less one.
