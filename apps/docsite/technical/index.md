# How it is built

```
Angular 22  ──IPC──▶  Rust (Tauri 2)  ──▶  libs/openrazer  ──DBus──▶  OpenRazer daemon
                            │
                            ├──▶  libs/twinkly   ──UDP/HTTP──▶  light strings
                            └──▶  the rendering engine
```

Nx 22 and pnpm hold the TypeScript side; a Cargo workspace at the repository
root holds the Rust side. Both put their libraries in `libs/`, because the split
that matters is what a piece of code is _for_, not what it is written in.

## Three modes, all of which must keep working

| Mode                    | Selected by                            | Backend                      |
| ----------------------- | -------------------------------------- | ---------------------------- |
| Browser                 | `window.__TAURI_INTERNALS__` is absent | in-memory mock               |
| Tauri + **fake daemon** | the daemon running against fake sysfs  | real Rust backend, real DBus |
| Tauri + hardware        | your distribution's daemon             | real                         |

The browser path is what makes the interface developable on any machine. **A
feature that only works in Tauri mode is not done** — the mock grows with each
feature, in the same change.

The middle mode is what catches contract drift. The mock validates the
_interface_ and says nothing about the Rust ↔ OpenRazer conversation; the fake
daemon makes that conversation observable.

## The boundary is validated, not trusted

Every value crossing the IPC is parsed with [valibot](https://valibot.dev)
before use. The static TypeScript type is a claim until something checks it.

That includes **rejections**: a refused command arrives as whatever the Rust
side serialised, and trusting its shape would give the interface a group id of
`undefined` and an offer to move a participant into "group undefined".

## Where things live

| Path                     | What                                                 |
| ------------------------ | ---------------------------------------------------- |
| `apps/synapse/src`       | the Angular application                              |
| `apps/synapse/src-tauri` | the Tauri shell, the engine, the groups, persistence |
| `libs/ui`                | product-agnostic components and the theming SDK      |
| `libs/backend-api`       | the only gateway to the Rust backend, and its mock   |
| `libs/openrazer`         | the OpenRazer daemon client — DBus and REST          |
| `libs/twinkly`           | discovery and control of Twinkly light strings       |

Read on: [the rendering engine](/technical/engine),
[the protocol libraries](/technical/protocols),
[how it is verified](/technical/testing).
