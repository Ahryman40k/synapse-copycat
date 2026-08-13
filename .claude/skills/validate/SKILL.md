---
name: validate
description: Run the right lint / test / build / typecheck / format commands for what you actually changed, across both the Nx workspace and the Rust crate that Nx does not know about. Use before reporting work as done, before opening a PR, or when asked to "check", "validate", "run the tests", "make sure it builds". Encodes the traps — biome rewriting files, nx format fighting biome, targets that do not exist.
---

# Validate a change

The validation story in this workspace is **not uniform**. Targets differ per
project, the Rust crate is outside Nx entirely, and two of the commands have
side effects that surprise people. Follow the table rather than guessing.

## 0. Prerequisite

Every Nx command triggers a pnpm dependency check first. If `pnpm install` is
broken, **every `nx` command fails** with a pnpm error that has nothing to do
with your change. Check that first:

```sh
pnpm install
```

If it fails, stop and fix the install — nothing else can be validated until it
passes, and the error you see from `nx` will have nothing to do with your
change. Do not work around it by editing code.

## 1. Pick the scope

| You changed…                     | Run                                                          |
| -------------------------------- | ------------------------------------------------------------ |
| Angular / TS anywhere            | `pnpm exec nx affected -t lint test`                         |
| `libs/ui`                        | `pnpm exec nx test ui` + `pnpm exec nx lint ui` + Storybook  |
| `libs/backend-api`               | `pnpm exec nx affected -t lint test` (the app depends on it) |
| Anything in `src-tauri/`         | the Rust block below — **Nx will not run it**                |
| A backend contract (either side) | Rust block **and** TS block **and** both run modes           |
| SCSS / theming                   | Storybook — tests will not catch an unthemed component       |
| Routing, bootstrap, config       | `pnpm exec nx serve synapse` and load the page               |

`affected` compares against the base branch. On a branch with no upstream yet it
can behave oddly — fall back to `run-many` if the affected set looks empty when
it should not be:

```sh
pnpm exec nx run-many -t lint test build
```

## 2. TypeScript side

```sh
pnpm exec nx affected -t lint test        # everyday loop
pnpm exec nx affected -t lint test build  # before a PR
```

There is **no `typecheck` target**. `nx build` typechecks the app, but the libs
are non-buildable (`ui` and `backend-api` expose only `test` and `lint`), so a
type error confined to a lib surfaces only through the app build or its tests.
To check a lib directly:

```sh
pnpm exec tsc -p libs/ui/tsconfig.lib.json --noEmit
```

## 3. Rust side — Nx does not cover this

`src-tauri` is excluded from ESLint and has no Nx target. `nx affected` will
report green on a change that does not compile.

```sh
cd apps/synapse/src-tauri
cargo check
cargo clippy --all-targets
cargo test                # currently no tests exist in this crate
cargo fmt --check
```

**Windows is never validated.** `backend/rest.rs` is `#[cfg(target_os = "windows")]`
and CI runs `ubuntu-latest` only, so a missing `DeviceBackend` method there
compiles green everywhere you can observe. If you touched the trait, say so
explicitly in your report instead of implying the change is verified.

## 4. Visual and runtime checks

```sh
pnpm exec nx run synapse:storybook   # :4400 — the only check for theming
pnpm exec nx serve synapse           # :4200 — browser mode, mock backend
pnpm exec nx run synapse:tauri       # desktop mode, real backend + OpenRazer daemon
pnpm exec nx e2e synapse-e2e         # Playwright (targets inferred by plugin)
```

A component missing its entry in `libs/ui/src/styles/sdk/ui.scss` renders with
default browser colours and **no error anywhere** — Storybook is the only thing
that catches it.

Any change to data flow must be checked in **both** modes. Browser mode uses the
mock from `app.config.ts`; Tauri mode uses the real Rust backend. Passing one
proves nothing about the other.

## 5. Traps

**Use `pnpm format`, not `nx format`.** `nx format` is hardcoded to Prettier, so
it only covers half the repo (`.scss` `.html` `.md` `.yml`). `pnpm format` runs
both Biome and Prettier over their respective scopes.

**Indentation depends on the file type, not the directory.** Biome owns `.ts` /
`.js` / `.json` (tabs); Prettier owns `.scss` / `.html` / `.md` (2 spaces). The
two scopes are kept disjoint by `.prettierignore` and `biome.json` — never
widen one so they overlap, or the formatters will start undoing each other.

**Do not reformat a file wholesale** as a side effect of a small change; it
makes the diff unreviewable.

**The pre-commit hook works and is fast** (~3 s thanks to Nx caching). It runs
formatting per glob with `stage_fixed`, then lint + test + build. Run the checks
yourself first so the hook is a confirmation rather than a discovery, and do not
bypass it with `--no-verify`.

**A green test run means very little here.** There are 5 spec files in the whole
workspace, `libs/ui/src/lib/button/button.spec.ts` asserts
`expect(true).toBe(true)`, and the Rust crate has no tests. Treat the suite as a
smoke test, not a safety net — if you changed behaviour, exercise it manually
and add the missing test.

## 6. Report honestly

State which commands you actually ran and what they returned. If you could not
run something — no daemon, no display, Windows target, broken install — say so
plainly rather than omitting it. "Tests pass" when the tests do not cover the
change is worse than saying the change is unverified.
