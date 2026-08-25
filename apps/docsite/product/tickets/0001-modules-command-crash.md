# 0001 — Remove the `modules` command and its dead TS concept

**Status: RESOLVED by the maintainer — this is a straight removal ticket now.**
No more design question; the two resolutions previously listed here are moot.
**Owners:** `frontend` (TS side), `backend` (Rust side).
**Depends on:** nothing.
**Feature inventory reference:** `apps/docsite/product/features.md` §6, last row.

## The problem, and the decision

`app.routes.ts::modulesResolver` runs on every visit to `/dashboard` and calls
`store.getModules()` → `backendApi.invoke('modules', {})`. `modules` is
declared in `BackendCommands` and has a mock entry, so it works in the
browser — but it is **not** registered in `lib.rs`'s `invoke_handler!` (the
line is commented out, and there's no `modules` function in `commands.rs` at
all). Under Tauri, every single dashboard load rejects on this call.

The maintainer's decision: **delete the caller.** The `Module` concept
(`kind: 'twinkly' | 'goove' | 'nanoleaf'`, note the `'goove'` typo) predates
the current model, where Twinkly is a `discovered` device/participant reached
through `twinkly_devices` and folded into groups — not a separate "module."
Nothing currently reachable needs it.

**Scope widened — `ux` reproduced a second, worse symptom of the same dead
concept, live and in the browser:** clicking the dashboard's "Modules" tile
throws an uncaught `RuntimeError: NG04002` — it constructs a route
(`module/twinkly`) that does not exist. So this isn't only a Tauri-path
defect any more; it's reproducible in browser/mock right now, and `qa` can
pin it with a Playwright test today, no fake daemon required. **The
acceptance bar is "no path from the dashboard reaches a Module," not merely
"the command is gone."** A fix that deletes the resolver/command but leaves
the tile and its click handler would still ship the crash.

## Scope

**`frontend`:**

- Delete `modulesResolver` from `app.routes.ts` and its use in the dashboard route's `resolve`.
- Delete the `modules` field from `ApplicationState` and `getModules()` from `application-store.ts`.
- Delete the `modules` command and its mock entry from `BackendCommands`/`mock*.ts`.
- Delete the `Module` type (`libs/backend-api/src/lib/models/module.ts`) if nothing else references it.
- Delete the "Modules" section from `dashboard-page.html`/`.ts` **including the tile's click handler** (`openModule(module)` in `dashboard-page.ts` and whatever navigation call it makes into `module/twinkly` or similar) — not just the `@if (modules().length)` guard. The guard being false today is exactly why nobody's noticed the click handler underneath is broken; removing the guard without removing the handler leaves dead, crashing code reachable the moment `modules` is ever non-empty again.
- Check `core/navigation/navigation.ts` and `core/models/place.ts` for a `module`-routed entry and remove it if the dashboard was its only caller.

**`backend`:**

- Remove the commented-out `// commands::modules,` line from `lib.rs`'s `invoke_handler!` (and `// commands::devices,` only if that one's also confirmed dead — check before touching; CLAUDE.md §13.6 named both together but `devices` is very much alive and registered elsewhere in the list, so this is almost certainly just a stale comment left over from the same edit — confirm rather than assume).

## Acceptance criteria

- [ ] **No path from the dashboard reaches a `Module`, in any mode.** Not "the command is gone" — the tile, the click handler, the route it constructed, the resolver, the command, and the TS type are all gone together.
- [ ] Opening `/dashboard` under Tauri + fake daemon produces no console error and no rejected promise related to `modules`.
- [ ] `qa`: a Playwright test in **browser/mock mode** (no Tauri needed) confirms the "Modules" tile/section no longer exists and no `NG04002` (or any) RuntimeError fires from the dashboard — this reproduces today, so write the failing test first if useful for confirming the fix.
- [ ] `nx test backend-api` and `nx test synapse` pass with the `modules`/`Module` references removed.
- [ ] `tsc --noEmit` on `backend-api` (root `AGENTS.md` §7) shows no dangling references.
- [ ] `qa`: dashboard loads cleanly under `openrazer-fake.sh`, no error toast/console entry mentioning `modules`, and no visible regression to the dashboard's layout (the Modules section was already empty/invisible in every mode, so nothing should look different).
