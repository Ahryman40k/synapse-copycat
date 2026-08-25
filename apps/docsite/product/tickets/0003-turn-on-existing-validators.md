# 0003 — Turn on the two valibot schemas that already exist and are never called

**Owner:** `frontend`
**Depends on:** nothing. Cheapest possible step toward closing the gap `frontend` flagged.
**Feature inventory / plan reference:** `plan.md` "Priority order" #5; root `AGENTS.md` §6 (the non-negotiable rule this closes a corner of).

## The problem

Root `AGENTS.md` §6: _"Every value crossing the application boundary must be
parsed with valibot before use."_ Nine Tauri IPC reads in the frontend
currently cross that boundary unparsed — cast via `as`/`satisfies` or trusted
outright rather than run through `safeParse`/`parse`. `frontend` found and
listed all nine while reading the codebase: `devices`, `modules`,
`twinkly_devices`, `groups`, `unassigned_participants` (all in
`application-store.ts`), `wallpapers`, `wallpaper_setters`, `set_wallpaper`,
`choose_wallpaper_folder` (in `wallpapers-store.ts`), plus the two `listen()`
event handlers (`devices_changed`, `twinkly_devices_changed`), which carry the
same wire shapes through a second door.

Two of the nine are nearly free to fix right now: `GroupStatus`
(`libs/backend-api/src/lib/models/group.ts`) and `Wallpaper`
(`libs/backend-api/src/lib/models/wallpaper.ts`) are **fully-written valibot
schemas** that every call site already imports — but only as `import type`,
never invoked. This ticket is scoped to those two only. The remaining seven
need a wire schema written from scratch per command and are a separate,
larger piece of work (worth its own ticket once this one lands, since it'll
establish the pattern to repeat).

## Where the two calls happen today

- `application-store.ts::getGroups()` — `backendApi.invoke('groups', {})` and
  `backendApi.invoke('unassigned_participants', {})` (the latter is
  `ParticipantId[]`, i.e. `string[]` — check whether it's worth wrapping too
  while you're in there, even though it wasn't one of the two "free" ones).
- `wallpapers-store.ts::read()` — `backendApi.invoke('wallpapers', { folder })`.

## Acceptance criteria

- [ ] `getGroups()` parses the `groups` response through `GroupStatus` (array) with `safeParse` before it reaches `patchState`. A response that fails to parse is logged (`console.warn`, matching the existing style in this file) and does **not** patch bad data into the store — same pattern already used for `getStripLighting`'s response parsing in the same file.
- [ ] `read()` in `wallpapers-store.ts` parses the `wallpapers` response through `Wallpaper` (array) the same way.
- [ ] Neither change alters the happy-path behavior visible to a user — this is a safety net, not a feature. Existing specs (`application-store.spec.ts`, `wallpapers-store.spec.ts`) continue to pass.
- [ ] A new spec (or an addition to an existing one) exercises the failure path: feed the store a malformed/wrong-shaped response (e.g. a group missing `cadence`, or a wallpaper with a non-hex colour in its palette) and confirm the store does not adopt it and logs a warning instead of throwing an unhandled error into the UI.
- [ ] `tsc -p libs/backend-api/tsconfig.spec.json --noEmit` and the equivalent for `synapse` stay clean (root `AGENTS.md` §7's reminder that Vitest's esbuild transpile won't catch a shape mismatch on its own).
- [ ] `qa`: no behavior change expected in the six core journeys (`journeys.md`) — this is a regression check, not a new scenario. Confirm nothing in journeys 2–6 (all of which touch `groups`) regressed.

## Explicitly out of scope for this ticket

Writing new schemas for `devices`, `modules`, `twinkly_devices`,
`unassigned_participants`, `wallpaper_setters`, `set_wallpaper`,
`choose_wallpaper_folder`, or the two `listen()` handlers. That's real work
(one schema per wire shape) and deserves its own ticket once this one
establishes the pattern — flag to `po` when this lands so that follow-up can
be written and prioritized.
