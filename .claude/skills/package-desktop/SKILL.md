---
name: package-desktop
description: Build the distributable Tauri desktop bundles (deb, AppImage, rpm) for the Synapse app — the Angular production build, the Rust release build and the bundler, in the right order with the right paths. Use when asked to package, bundle, produce a release artifact, or ship the app. There is no Docker in this project; this is the distribution path.
---

# Package the desktop app

This project ships a Tauri desktop bundle, not a container. There is no
Dockerfile and no container registry — the distributable artifacts are the
Linux packages produced by the Tauri bundler.

The pipeline is cross-toolchain and the two halves are wired together through
`apps/synapse/src-tauri/tauri.conf.json`, not through Nx:

```
nx run synapse:build:production      Angular → dist/apps/synapse/browser
            ↓  (tauri.conf.json → build.frontendDist)
cargo build --release                Rust  → dist/apps/.target
            ↓
tauri bundler                        → .deb / .AppImage / .rpm
```

## ⚠️ Read this before running anything

`tauri.conf.json` currently declares:

```json
"frontendDist": "../../../../dist/apps/synapse"
```

Tauri resolves this relative to the directory holding `tauri.conf.json`, which
is `apps/synapse/src-tauri/`. Counting up: `..` → `apps/synapse`, `../..` →
`apps`, `../../..` → repo root, `../../../..` → **the parent of the repo**. That
is one level too many, and the path is also missing the `browser/` subdirectory
that `@angular/build:application` emits into (compare `serve-static`, which
correctly uses `dist/apps/synapse/browser`).

The expected value is:

```json
"frontendDist": "../../../dist/apps/synapse/browser"
```

This has not been verified by an actual build. **Confirm the real output layout
before changing it**: run the Angular build and look at what lands in `dist/`.
Do not fix it blind, and do not fix it silently as a side effect of another task.

## Steps

### 1. Frontend

```sh
pnpm exec nx run synapse:build:production
ls dist/apps/synapse            # confirm the layout — expect a browser/ dir
```

The production configuration swaps the runtime config file via
`fileReplacements`: `src/config/app.json` → `src/config/app.production.json`.
Check that the production config is actually correct for the release — it is
fetched at bootstrap and validated by valibot in `main.ts`, and a bad value
means the app fails to boot with `APPLICATION CONFIG NOT FOUND` in the console
and nothing on screen.

Bundle budgets are enforced: 1 MB error on initial, 8 KB on any component style.
A budget overrun fails the build.

### 2. Bundle

```sh
cd apps/synapse/src-tauri
CARGO_TARGET_DIR=../../../dist/apps/.target pnpm exec tauri build
```

The `CARGO_TARGET_DIR` override keeps Rust artifacts inside `dist/` — it mirrors
what the `synapse:tauri` dev target does. Without it, cargo writes to
`src-tauri/target/`, which is gitignored but bloats the working tree.

`tauri.conf.json` sets `"targets": "all"`, so on Linux the bundler produces
`.deb`, `.AppImage` and `.rpm` under
`dist/apps/.target/release/bundle/`.

Note that `beforeBuildCommand` already runs `nx run synapse:build:production`,
so step 1 is partly redundant — do it anyway the first time, to inspect the
output layout.

### 3. Verify the artifact

Do not report a successful package without checking that it runs:

```sh
ls -la dist/apps/.target/release/bundle/*/
# then install or execute the AppImage and confirm the window opens
```

A bundle that builds but shows a blank window is the signature of a wrong
`frontendDist` — the shell starts, finds no `index.html`, and renders nothing.

## Known limitations

- **Linux only in practice.** `targets: "all"` on a Linux host produces Linux
  bundles. The Windows backend (`src-tauri/src/razer/backend/rest.rs`) is never
  compiled here and CI runs `ubuntu-latest`, so a Windows build is untested.
- **No release automation.** `.github/workflows/ci.yml` runs lint/test/build/e2e
  only; nothing publishes or attaches artifacts. Packaging is a manual local
  step today.
- **Identifier is still the template default** — `"identifier": "com.tauri.dev"`
  in `tauri.conf.json`. It should be changed to a real reverse-domain identifier
  before any public distribution, since it determines the app's install path and
  desktop entry. Raise it, do not change it unilaterally.
- **The app needs the OpenRazer daemon** at runtime on Linux. A packaged app on
  a machine without it will start and fail at `RazerState::new()`, which
  `expect()`s and therefore panics on startup. Worth knowing before shipping to
  anyone.

## Report

Say which artifacts were produced and where, whether you launched one, and
whether `frontendDist` needed correcting. If you only got as far as the Angular
build, say that — a green `cargo build` is not a verified bundle.
