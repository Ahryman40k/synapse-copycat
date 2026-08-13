# AGENTS.md — `libs/backend-api`

The single gateway between the Angular app and the Rust backend. Read the root
`AGENTS.md` first; this file covers the mock contract and how to grow it.

---

## The rule

> **Every feature must work under `provideBackendApi(withMock(…))`.**

Mock mode is not a testing convenience — it is the **primary development mode**
for this project. It is what lets the UI be built, storybooked and tested on any
machine, with no Razer peripheral and no OpenRazer daemon.

A feature that only works in Tauri mode is **not done**. Concretely, before you
call anything finished:

- `pnpm exec nx serve synapse` renders and behaves correctly in a plain browser
- the Storybook story renders with real data flowing through the store
- the specs run without a daemon

**Never import `invoke` from `@tauri-apps/api` outside this library.** That
import is what would break the browser path. Everything goes through the
`BackendApi` injection token.

---

## The mock is deliberately incomplete

Today the mock covers `devices` and `modules` with a couple of fixtures. That is
expected — **it grows feature by feature, alongside the code that needs it.**

This has one practical consequence, and it is the important part of this
document:

> **Extending the mock is part of the feature, not follow-up work.**

If your change makes the app call something the mock does not answer, you add
the mock data in the same change. Not in a TODO, not in a later PR. A commit
that leaves the browser path broken has broken the primary development mode for
everyone else.

Do not try to "complete" the mock in one sweep either. Add exactly what the
feature needs, with data realistic enough to reveal layout and formatting bugs
(real device names, plausible values, empty and error states where they matter).

---

## How the pieces fit

```
BackendCommands        the contract: one entry per command, wire shapes
      │
      ├─► Mock = { [K in keyof BackendCommands]: BackendCommands[K]['returnType'] }
      │
      └─► invoke<C>(cmd, args, options)   generic over the command name
```

`Mock` is **derived** from `BackendCommands`. That is the mechanism that is
supposed to keep the two in sync: adding a command makes every existing mock
object incomplete, and TypeScript points at each place to fill in.

⚠️ **That safety net is currently not armed.** Vitest transpiles through esbuild,
which strips types without checking them, and the workspace has no `typecheck`
target. So a mock whose shape is wrong compiles, runs, and passes green. There
is a live example: `src/lib/services/backend-api.spec.ts` builds its `Mock` from
**domain** shapes (`__type`, `id`, `visual`) where the contract requires **wire**
shapes (`vendor_id`, `product_id`). `tsc -p libs/backend-api/tsconfig.spec.json
--noEmit` reports four errors on it; `nx test backend-api` passes.

Until a `typecheck` target exists, run `tsc --noEmit` yourself after touching
anything mock-related.

---

## Wire shape vs domain shape

Keep these straight — mixing them is the most common mistake here.

| | Wire shape | Domain shape |
|---|---|---|
| Defined in | `BackendCommands[…]['returnType']` | `Device`, `Module` |
| Looks like | `{ kind, vendor_id: 5426, product_id: 136, name }` | `{ __type, kind, id: '5426-0136', name, visual }` |
| Who produces it | Rust, and therefore **the mock** | the store's mapping step |

`withMock()` takes **wire** shapes. It stands in for the Rust backend, so it must
lie in exactly the same language the backend speaks. The conversion to `Device` /
`Module` — zero-padding the ids, deriving the `visual` asset path — happens in
`application-store.ts`, and that mapping is real logic you want the mock to
exercise.

This is also why a story that substitutes `ApplicationStore` wholesale is weaker
than one that provides `withMock`: it skips the mapping, which is the part most
likely to be wrong.

---

## Adding a command

Three steps, in this order:

1. **Rust** — implement and register it (`apps/synapse/src-tauri/AGENTS.md`).
2. **`models/backend-commands.ts`** — add the entry using the wire shape:

```ts
export type BackendCommands = {
	my_command: {
		args: { serial: string };
		options: Record<string, never>;
		returnType: { some_field: number }[];
	};
};
```

3. **Fill in every mock TypeScript now flags** — `app.config.ts` first (that is
   the running app), then the specs and stories that construct a `Mock`.

Then map and **validate** the response into a domain type in the store. The
project rule (root `AGENTS.md` §6) is that nothing crossing the boundary is
trusted until parsed with valibot. `application-store.ts` currently casts with
`satisfies` and carries two `// TODO: write wrapper here + validator` comments —
do not copy that pattern into new code.

---

## Known gaps

*Snapshot 2026-08-11. These are design limits to be aware of, not bugs to fix
en masse. Fix one when a feature actually needs it.*

1. **The fixture is duplicated five times** — inline in
   `apps/synapse/src/app/app.config.ts`, and again in `application-store.spec.ts`,
   `app.spec.ts`, `default-layout.spec.ts`, `backend-api.spec.ts`. They have
   already diverged (different devices, different shapes, one of them invalid).
   When you next touch two of them, extract a shared fixture instead.

2. **Storybook bypasses the mock entirely.** `dashboard-page.stories.ts`
   substitutes `ApplicationStore` with a hand-built `signalStore`, so no story
   currently exercises `withMock` or the store's mapping. Note that
   `apps/synapse/.storybook/preview.ts` is **empty** — a global
   `applicationConfig` decorator providing `provideBackendApi(withMock(…))`
   there would give every story the mock for free.

3. **`Mock` is one static value per command.** `BackendApiService.invoke`
   returns `this.mock[cmd]` and ignores `args` entirely. This works for
   `devices` / `modules`, but the real backend's main entry point is
   `run_capability(serial, request)` — one command carrying many request and
   response shapes. A value-per-command mock cannot express that. Before
   building capability-driven UI (DPI, brightness, chroma effects), `Mock` will
   need to accept a function, something like:

   ```ts
   type MockEntry<C> =
     | BackendCommands[C]['returnType']
     | ((args: BackendCommands[C]['args']) => BackendCommands[C]['returnType'] | Promise<…>);
   ```

   Raise it when you get there rather than working around it.

4. **The mock cannot fail like the backend.** It rejects with a generic
   `new Error('Mocked backend call failed')`, while the real backend returns a
   serialized `BackendError` (`InterfaceUnsupported`, `DeviceNotFound`,
   `Transport`, `Protocol`). Error-handling UI therefore cannot be developed in
   browser mode today.

5. **The declared commands do not exist in Rust.** `devices` and `modules` are
   registered nowhere — `lib.rs` exposes `run_capability` and `list_devices`.
   Mock mode works; Tauri mode does not. See `apps/synapse/src-tauri/AGENTS.md`.
