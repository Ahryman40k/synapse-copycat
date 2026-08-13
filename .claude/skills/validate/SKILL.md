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

If it fails with `ERR_PNPM_IGNORED_BUILDS`, stop and fix
`pnpm-workspace.yaml` — nothing else can be validated until it passes. Do not
work around it by editing code.

## 1. Pick the scope

| You changed… | Run |
|---|---|
| Angular / TS anywhere | `pnpm exec nx affected -t lint test` |
| `libs/ui` | `pnpm exec nx test ui` + `pnpm exec nx lint ui` + Storybook |
| `libs/backend-api` | `pnpm exec nx affected -t lint test` (the app depends on it) |
| Anything in `src-tauri/` | the Rust block below — **Nx will not run it** |
| A backend contract (either side) | Rust block **and** TS block **and** both run modes |
| SCSS / theming | Storybook — tests will not catch an unthemed component |
| Routing, bootstrap, config | `pnpm exec nx serve synapse` and load the page |

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

**`nx lint ui` rewrites your files.** Unlike the other projects, `libs/ui` has
`"lint": nx:run-commands → biome check --write`. It is a formatter run, not a
read-only check. Expect a dirty working tree afterwards.

**Do not run `nx format:write`.** It is Prettier-based (Prettier 2.8.8,
`.prettierrc` with no indentation setting → 2 spaces), while `libs/ui` is
Biome-formatted with tabs. Running it converts `libs/ui` to spaces, and the next
`nx lint ui` converts it straight back. This is why the `format` step in
`lefthook.yml` is commented out. Leave it alone until the workspace settles on
one formatter.

**Match the file you are editing.** `libs/ui` is tabs, everything else is
2 spaces. Never reformat a file wholesale as a side effect of a small change.

**The pre-commit hook is slow.** `lefthook.yml` runs lint + test + **build**
over all projects, not `affected`. Run the checks yourself first so the hook is
a confirmation rather than a discovery. Do not bypass it with `--no-verify`.

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
