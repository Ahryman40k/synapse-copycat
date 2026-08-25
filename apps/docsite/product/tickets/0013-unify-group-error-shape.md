# 0013 — One error shape across all eight group commands

**Status: awaiting `frontend`'s confirmation of the shape `backend` proposed.** Do not start building until `frontend` replies.
**Owner:** `backend` (Rust), `frontend` confirms/adjusts the shape and updates its side.
**Depends on:** nothing to _design_ (backend already proposed a shape); building it depends on `frontend`'s sign-off.
**Sequencing note from the lead:** `backend` separately found that `openrazer::BackendError` has become the whole application's error vocabulary (a _wallpaper_ failure gets stringified into `BackendError::Protocol`) — the same seam the not-yet-started `Surface` protocol-abstraction extraction touches. The lead wants these landed as **one change, not two passes over the same code** — so this ticket should be sequenced together with (or immediately after) that extraction once the maintainer authorises it, not built as a standalone patch first. Tracked here so it isn't lost; `po` will re-flag when `Surface` gets a green light.

## The problem

Two incompatible error shapes exist across the group commands today. The
five mutations (`create_group`, `rename_group`, `set_group_members`,
`set_group_ambience`, `set_group_cadence`) answer the internally-tagged
`GroupError`:

```json
{ "kind": "unknownGroup", "id": 7 }
```

But `start_group`, `stop_group`, `remove_group` answer `BackendError`,
externally tagged, **stringifying** the structured error away:

```json
{ "Protocol": "no group 7" }
```

Same fault, two shapes. `frontend` has to parse both, and the second form
throws away exactly the structured information (`GroupError::unknownGroup`'s
id) that the first preserves.

## The proposed shape (backend's, pending frontend confirmation)

One union, internally tagged on `kind`, camelCase, covering both families —
matches the tagging `frontend`'s existing `GroupError` valibot schema
already uses, so the five mutations need **no** frontend change; only
start/stop/remove change, from lying to telling the truth:

```json
{ "kind": "unknownGroup", "id": 7 }
{ "kind": "alreadyTaken", "participant": "XX0000000226", "by": 3 }
{ "kind": "daemonUnavailable", "detail": "…" }
{ "kind": "deviceNotFound" | "interfaceUnsupported", "participant": "…" }
{ "kind": "transport" | "protocol", "detail": "…" }
```

One union rather than two types, because `start_group` can genuinely fail
either way (an unknown group, or a live daemon/device fault) — two types
would mean every call site handles both regardless, so a single union costs
nothing extra at the call site and saves the two-shape problem.

## Scope

- 8 Tauri commands change their error type (`create_group` through
  `remove_group`); the MCP tools change with them for free since both go
  through the same `RazerState` façade.
- `frontend`'s `GroupError` valibot schema (`libs/backend-api/src/lib/models/group.ts`)
  extends to the new variants; `attempt()`'s parsing in the same file should
  need no structural change since the tagging convention is unchanged.

## Acceptance criteria

- [ ] `frontend` has confirmed (or countered) the shape above.
- [ ] All 8 group commands answer the same tagged union on failure.
- [ ] `qa`: for each of `start_group`, `stop_group`, `remove_group`, calling with a nonexistent group id answers `{"kind":"unknownGroup", ...}` — not `{"Protocol":"..."}`.
- [ ] `qa`: `set_group_members` with a participant already held by another group still answers `alreadyTaken`, carrying both the participant and the holding group's id (regression check — this must not degrade in the unification).
- [ ] `qa`: the MCP tools (`remove_group`, `set_group_members`, `start_group`, `stop_group`) surface the same structured shape, not a stringified one, since they share the façade.
- [ ] No behaviour change to which operations succeed or fail — this is a shape change only, not a rule change.
