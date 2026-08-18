# AGENTS.md

Operating manual for AI agents and new contributors working in this repository.
Read this before touching any file. Nested `AGENTS.md` files add local rules —
they win over this one inside their directory.

---

## 1. What this project is

**Synapse** is a Linux replacement for Razer Synapse: a desktop application that
manages RGB lighting and settings for Razer peripherals.

- **Frontend** — Angular 21 (standalone, signals, zoneless-leaning)
- **Shell** — Tauri 2 (Rust)
- **Backend** — Rust, talking to the OpenRazer daemon over **DBus** on Linux and
  over **REST** on Windows, behind a single trait
- **Monorepo** — Nx 22 + pnpm 10

The app runs in two modes and both must keep working:

| Mode                              | How it is detected                      | Backend used                   |
| --------------------------------- | --------------------------------------- | ------------------------------ |
| Tauri desktop                     | `window.__TAURI_INTERNALS__` is present | real Rust backend via `invoke` |
| Browser (dev / Storybook / tests) | it is absent                            | in-memory mock (`withMock`)    |

The detection lives in `apps/synapse/src/app/app.config.ts`. **Never break the
browser path** — it is what makes the UI developable and testable without a
Razer device plugged in.

---

## 2. Repository map

```
apps/
  synapse/            Angular application + Tauri shell
    src/app/
      core/           app-wide plumbing: layout, stores, shared components
      domains/        feature pages (dashboard, devices/mouse, devices/mousemat…)
      models/         app-local valibot schemas (runtime config)
    src/config/       static runtime config, fetched at bootstrap
    src-tauri/        Rust backend  → see apps/synapse/src-tauri/AGENTS.md
  synapse-e2e/        Playwright end-to-end tests
  docsite/            VitePress documentation site
libs/
  ui/                 design-system components  → see libs/ui/AGENTS.md
  backend-api/        the ONLY gateway to the Rust backend
docs/                 (currently empty; target of deepdocs.yml)
```

Import aliases (declared in `tsconfig.base.json`):

```ts
import { Button } from '@synapse-copycat/ui';
import { BackendApi, type Device } from '@synapse-copycat/backend-api';
```

Both libs are **non-buildable**: they are consumed directly through tsconfig
paths and have only `test` and `lint` targets. Do not add a `build` target
without a reason.

### Where does my new code go?

| I am adding…                                              | Location                                        |
| --------------------------------------------------------- | ----------------------------------------------- |
| A generic, product-agnostic widget (button, slider, card) | `libs/ui/src/lib/<name>/`                       |
| A component that knows about Razer devices                | `apps/synapse/src/app/core/components/`         |
| A whole page / feature                                    | `apps/synapse/src/app/domains/<name>/`          |
| A layout shell                                            | `apps/synapse/src/app/core/layout/`             |
| Application state                                         | `apps/synapse/src/app/core/stores/`             |
| A new backend call                                        | `libs/backend-api` **and** `src-tauri` (see §7) |

Rule of thumb: if it would still make sense in a project that has nothing to do
with Razer, it belongs in `libs/ui`.

---

## 3. Commands

Always run through pnpm. Nx caches, so re-running is cheap.

```sh
# install
pnpm install

# the everyday loop
pnpm exec nx affected -t lint test        # only what your change touched
pnpm exec nx run-many -t lint test build  # everything

# a single project
pnpm exec nx test ui
pnpm exec nx lint synapse
pnpm exec nx build synapse

# run things
pnpm exec nx serve synapse            # Angular dev server, browser + mock backend
pnpm exec nx run synapse:tauri        # full desktop app, real Rust backend
pnpm exec nx run synapse:storybook    # Storybook on :4400
pnpm exec nx run synapse:test-storybook  # every story's play, in a real Chromium
pnpm docs:dev                         # VitePress docs

# e2e (targets are inferred by the @nx/playwright plugin)
pnpm exec nx e2e synapse-e2e

# Rust — nx does not wrap these
cd apps/synapse/src-tauri
cargo check
cargo clippy --all-targets
cargo test
```

Formatting is two tools with disjoint scopes (§11):

```sh
pnpm format         # biome (.ts/.js/.json) + prettier (.scss/.html/.md/.yml)
pnpm format:check   # same, read-only
```

`nx format:write` is Prettier-only and therefore covers just half the repo. It
is now harmless — `.prettierignore` keeps it off Biome's files — but prefer
`pnpm format`, which does both.

`test-storybook` is the only target that needs a browser. It builds Storybook,
then `start-server-and-test` serves it with `@nx/web:file-server` on 6006,
waits for it to answer, runs the Storybook test runner and stops the server
afterwards — including when the tests fail, which is the part worth having a
dependency for. Storybook's own documentation reaches for `concurrently` +
`http-server` + `wait-on`; one package doing all three is the same idea with
less to wire, and `http-server` is unnecessary because the Nx file-server is
already here.

The port check in front of it is ours: `start-server-and-test` is happy to test
a server that was already running, which after a crashed run means passing
against stale stories. It waits ten seconds before giving up, because two
commits in a row can catch the previous run still letting go of the port.

Chromium comes from the `postinstall`. `install-deps` there needs root and only
warns without it, so a machine that never ran it will download the browser and
still fail to launch it.

The Vitest addon is not an option: it is a Vite plugin, and `@storybook/angular`
builds with webpack. Portable stories are not either — `composeStories` is not
exported by the Angular framework. So the plays cannot join `nx test`, and this
is a second suite.

There is **no `typecheck` target**. Until one exists, typecheck with:

```sh
pnpm exec tsc -p apps/synapse/tsconfig.app.json --noEmit
```

Targets are not uniform across projects. `ui` and `backend-api` are
non-buildable and expose only `test` and `lint`; `synapse-e2e` declares none at
all (they are inferred by the `@nx/playwright` plugin); `src-tauri` is outside
Nx entirely. **Use the `validate` skill** rather than guessing what to run.

---

## 4. Angular conventions

This codebase targets **Angular 21**. Do not write Angular 14-era code.

**Files are named without a suffix.** `button.ts`, `dashboard-page.ts`,
`app.ts` — not `button.component.ts`. Template and styles sit next to the class
as `<name>.html` / `<name>.scss`.

**Components are standalone.** There are no `NgModule`s in this repo. Declare
dependencies in `imports: [...]`.

```ts
@Component({
  selector: 'dashboard-page',
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  imports: [CommonModule],
})
export class DashboardPage {
  readonly #store = inject(ApplicationStore); // #private for injected deps

  protected devices = this.#store.devices; // protected for template-only members
}
```

Follow these, all observed in the existing code:

- **`inject()`**, not constructor parameter injection.
- **`#private`** ECMAScript fields for dependencies; **`protected`** for members
  the template reads; `public` only for a real external API.
- **Signals** for state: `model()` for two-way bindings (see
  `libs/ui/src/lib/switch/switch.ts`), `input()` / `output()` for the rest.
- **`ChangeDetectionStrategy.OnPush`** on new components.
- **`host: {}`** in the decorator instead of `@HostBinding` / `@HostListener`.
- **`import type`** for type-only imports — Biome and the TS config expect it.

### Known naming inconsistency

Class names are not uniform: `Button`, `DashboardPage`, `App` (no suffix) coexist
with `SwitchComponent`, `MousePageComponent`, `MousematPageComponent`. **Prefer
the no-suffix form** for new code. Do not mass-rename the old ones as a side
effect of an unrelated change.

Selectors are likewise mixed: `libs/ui` uses the `syn-` prefix
(`syn-button`, `syn-switch`), app components use bare names (`dashboard-page`)
even though `project.json` declares `"prefix": "app"`. Match the neighbouring
files rather than the `project.json` value.

---

## 5. State management

`@ngrx/signals` **signal stores** — not the classic ngrx store/actions/reducers/
effects triad. There is exactly one store today:

`apps/synapse/src/app/core/stores/application-store.ts`

```ts
export const ApplicationStore = signalStore(
  { providedIn: 'root' },
  withState<ApplicationState>({ devices: [], modules: [] }),
  withMethods((store, backendApi = inject(BackendApi)) => ({
    async getDevices(): Promise<Device[]> { … patchState(store, { devices }); }
  })),
);
export type ApplicationStore = InstanceType<typeof ApplicationStore>;
```

Note the trailing `export type … = InstanceType<typeof …>` — keep it, it is what
lets `inject(ApplicationStore)` be typed at call sites.

Routes populate the store through resolvers (`devicesResolver`,
`modulesResolver` in `app.routes.ts`), and components read the signals. Do not
fetch from a component directly.

---

## 6. Runtime type checking — non-negotiable

The README states the rule and it is the project's core principle:

> Any external object should be validated at runtime.

**Every value crossing the application boundary must be parsed with
[valibot](https://valibot.dev) before use** — the static TypeScript type is a
lie until it is validated. This covers: the JSON config file, anything returned
by a Tauri `invoke`, anything read from disk or network.

The canonical example is `apps/synapse/src/main.ts`:

```ts
const validation = safeParse(ApplicationConfig, maybeConfig);
if (validation.success) {
  bootstrapApplication(App, makeAppConfig(validation.output));
}
```

Schema and inferred type share one name, which is the house style:

```ts
export const ApplicationConfig = object({ envName: string() });
export type ApplicationConfig = InferOutput<typeof ApplicationConfig>;
```

⚠️ **This rule is currently violated** in `application-store.ts`, where two
`// TODO: write wrapper here + validator` comments mark backend responses that
are cast rather than parsed. If you touch that code, add the validators.

---

## 7. Talking to the Rust backend

> **Mock mode is the primary development mode. Every feature must work under
> `provideBackendApi(withMock(…))`.**

Not a testing convenience — it is how the UI gets built at all, on any machine,
with no Razer device and no OpenRazer daemon. A feature that only works in Tauri
mode is not done.

The mock is **deliberately incomplete and grows feature by feature**. If your
change makes the app call something the mock does not answer, you extend the
mock **in the same change** — that is part of the feature, not follow-up work.
See `libs/backend-api/AGENTS.md` for how.

**Never import `invoke` from `@tauri-apps/api` outside `libs/backend-api`.**
The whole app goes through the injected `BackendApi` token, which is what makes
the browser/mock mode possible.

```ts
const store = inject(BackendApi);
const devices = await backendApi.invoke('devices', {}); // fully typed
```

The contract is the `BackendCommands` type in
`libs/backend-api/src/lib/models/backend-commands.ts`. Each command declares its
`args`, `options` and `returnType`; `invoke()` is generic over the command name,
so a typo or a wrong argument shape is a compile error.

Adding a backend call means touching **three** places, in this order:

1. **Rust** — implement the command and register it in the `invoke_handler!` in
   `apps/synapse/src-tauri/src/lib.rs` (see `src-tauri/AGENTS.md`).
2. **`BackendCommands`** — add the entry with its `args` / `returnType`. Use the
   raw wire shape here (snake_case, `vendor_id: number`), not the app-facing type.
3. **Mapping + validation** — convert the wire shape into the domain type
   (`Device`, `Module`) in the store, with a valibot schema.

`Mock` is derived from `BackendCommands`, so step 2 is _meant_ to keep every
mock honest: add a command and TypeScript points at each mock that is now
incomplete.

⚠️ **That safety net is not armed today.** Vitest transpiles via esbuild without
typechecking and there is no `typecheck` target, so a wrongly-shaped mock
compiles, runs and passes green — `backend-api.spec.ts` is a live example. After
touching anything mock-related, run `tsc --noEmit` yourself:

```sh
./node_modules/.bin/tsc -p libs/backend-api/tsconfig.spec.json --noEmit
```

---

## 8. Styling and theming

SCSS, with a hand-rolled theming SDK in `libs/ui/src/styles/`.

**The split matters:** a component ships two stylesheets and they have different
jobs.

| File                 | Contains                                         | Never contains |
| -------------------- | ------------------------------------------------ | -------------- |
| `button.scss`        | structure — layout, spacing, radius, font-weight | colours        |
| `_button.theme.scss` | colours, derived from the `$theme` map           | layout         |

`_<name>.theme.scss` exports a single mixin:

```scss
@use 'sass:map';

@mixin apply($theme) {
  $primary: map.get($theme, primary);

  syn-button,
  button[synapse-button] {
    background-color: $primary;
  }
}
```

A theme is a Sass map built by `create-theme-light()` / `create-theme-dark()`
with keys: `version`, `tone`, `primary`, `contrast`, `accent`, `background`.

Registration differs by location — miss this and your theme silently never applies:

- **`libs/ui` component** → add a `@use` + `@include` in
  `libs/ui/src/styles/sdk/ui.scss`
- **app component** → add a `@use` + `@include` in `apps/synapse/src/styles.scss`

### Where this is heading — read before touching a theme file

The theming SDK is **a work in progress, not a finished system**. The component
theme files you will find are sketches and experiments toward the design below;
treat them as such rather than as a convention to copy. Hardcoded colours in
them are known and expected at this stage.

**The product intent.** Synapse controls the RGB lighting of Razer peripherals.
When a device's colour is set, **the whole application theme adopts it** — so
the UI visibly reflects what the hardware is doing. The colour is discovered by
the Rust backend on device enumeration; for now the **first device found** wins.
(Per-device colours are an open design question — devices can each have their
own.) A default palette must exist for first paint and for the browser/mock
path, before any device answers.

**What is and is not runtime.** `primary` is the _only_ colour that changes at
runtime. Text, surfaces, `error`, `warning` and `success` are fixed. So the
palette cannot be computed at build time by Sass — it is derived in TypeScript
when the colour changes, and published as CSS custom properties that the Sass
mixins reference.

**The rule that makes it safe.** The chosen colour contributes **hue and chroma
only — never lightness**. Lightness always comes from a fixed tone ladder tied
to the role. Verified across green, red and blue sources: every text pair stays
above the 4.5:1 WCAG floor, within 0.1 of the same ratio. Without this rule a
pale colour washes the interface out — `#00ff00` sits at OKLCH `L = 0.866`, far
too light to be used raw as `primary`; it is tone-mapped to `#48c242`.

**The raw colour is kept too.** A separate unmapped role holds the device's
exact RGB, used for the glow behind the device image. Do not derive that one
from the tone ladder — it must match the hardware.

**The colour crosses the IPC boundary**, so it is validated with valibot like
any other backend value (§6). `hexColor()` exists natively; combine it with
`length(7)` to require `#rrggbb`.

This is the same model as Material 3, where `material-color-utilities` computes
tonal palettes in TypeScript from a source colour and writes CSS custom
properties — Android's wallpaper-driven theming is the same problem.

---

## 9. Storybook

Every `libs/ui` component and every visual app component gets a `.stories.ts`
beside it. The Storybook config lives in `apps/synapse/.storybook/main.ts` and
globs **both** `apps/synapse/src/app/**` and `libs/ui/src/lib/**`.

```ts
const meta: Meta<Button> = { component: Button, title: 'UI library / Button' };
export default meta;

export const ButtonPrimary: StoryObj<Button> = {
  name: 'Button primary',
  render: () => ({ template: '<syn-button synapse-button>Primary</syn-button>' }),
};
```

Titles: `'UI library / <Name>'` for `libs/ui`. Components driven by attributes
rather than inputs are exercised with `render: () => ({ template })`, as above.

Chromatic is wired (`chromatic.config.json`, `pnpm chromatic`) — visual diffs
land on PRs.

---

## 10. Tests

**Vitest** through `@nx/vitest`, with `@analogjs/vite-plugin-angular`.
Configuration is per-project in `vite.config.mts`; environment is `jsdom` and
`src/test-setup.ts` runs first. `@testing-library/angular` is available and
preferred over raw `TestBed` for component tests.

Specs live next to the code as `<name>.spec.ts`.

⚠️ **Coverage is currently very thin** — 5 spec files for the whole workspace,
and `libs/ui/src/lib/button/button.spec.ts` is a placeholder asserting
`expect(true).toBe(true)`. The Rust backend has no tests at all. When you change
behaviour, add the missing test rather than assuming one exists; do not treat a
green test run as proof that nothing broke.

E2E is Playwright in `apps/synapse-e2e`, currently the generated example only.

---

## 11. Formatting and linting — read this before writing code

**Two formatters, one linter.** Each tool owns a set of extensions and they must
never overlap.

| Tool         | Owns                                                   | Indentation             |
| ------------ | ------------------------------------------------------ | ----------------------- |
| **Biome**    | `.ts` `.tsx` `.js` `.mjs` `.cjs` `.mts` `.cts` `.json` | **tabs**, single quotes |
| **Prettier** | `.scss` `.css` `.html` `.md` `.mdx` `.yml`             | **2 spaces**            |
| **ESLint**   | linting only, all five projects                        | —                       |

### Why two formatters

Biome cannot format SCSS (it does CSS; Sass is a different language) and its
HTML support is still experimental — that is 46 of ~108 source files. Prettier
is therefore not removable. And `nx format` is **hardcoded to Prettier**:
`nx/src/command-line/format/format.js` does a bare `require('prettier')`, and
`nx-schema.json` exposes no formatter option, so Biome cannot be substituted.

The split is enforced by ignore files, not by configuration:

- `.prettierignore` cedes the TypeScript/JSON families to Biome
- `biome.json` `files.includes` lists only the extensions Biome owns

**Never let the two scopes overlap.** Before, both formatted `.ts`:
`nx format:write` rewrote `libs/ui` to spaces and the next lint run put the tabs
back. Widening either scope brings that back.

`.editorconfig` carries a per-extension override so your editor agrees with
whichever formatter owns the file, and `.vscode/settings.json` binds the right
formatter per language.

### Linting

ESLint runs on all five projects via `@nx/eslint:lint`. Biome's linter is
**disabled** (`"linter": { "enabled": false }`) so there is exactly one linter.

ESLint is not a fallback — it is the only tool that can do three things Biome
structurally cannot: read the Nx project graph
(`@nx/enforce-module-boundaries`), understand Angular (`@angular-eslint`
selectors and template rules), and use the TypeScript type checker. Biome is a
file-level formatter; it has no view of the dependency graph.

`**/src-tauri` is excluded from ESLint (Rust is linted by clippy).

⚠️ Type-aware linting is **not** enabled: the Nx preset sets only
`parserOptions.tsconfigRootDir`, with no `project` / `projectService`. Rules like
`no-floating-promises` are therefore unavailable.

---

## 12. Git workflow

### 🛑 The maintainer reviews every change before it is committed

**Never commit on your own initiative.** When work is finished:

1. Run the checks (§3, or the `validate` skill) and report what they returned.
2. **Present the change for review** — the list of touched files and the diffs
   that matter, so it can be read without running `git diff`.
3. **Wait for explicit approval**, then commit.

"Do the task" is **not** approval to commit; neither is approval of an earlier
commit. Each one is asked for separately. This is a standing rule — the
maintainer should not have to repeat it.

### Conventions

- Branch naming follows `NN-short-description` (`10-integrate-ai`).
- Conventional commits: `feat(synapse): …`, `fix(pnpm): …`, `docs(agents): …`.
- `lefthook.yml` installs a `pre-commit` hook running format, lint, test and
  build (~3-5 s, Nx caches). Do not bypass it with `--no-verify` to work around
  a failure — fix the failure. If bypassing is genuinely warranted, say so and
  record the reason in the commit message.
- Keep unrelated concerns in separate commits. A reformat and a behaviour change
  in the same diff cannot be reviewed.

---

## 13. Known issues — do not be surprised by these

_Snapshot taken 2026-08-13 on branch `10-integrate-ai`. Fix them deliberately,
not as drive-by changes. Delete an entry once it is resolved — a stale list is
worse than no list._

1. **Node and pnpm versions are not pinned** — local Node `v26` / pnpm `v11`,
   `engines` says node `>=22` and pnpm `>=10.13.0`, CI pins node `24` and
   pnpm `10`, and `@types/node` is `18.16.9`. No `.nvmrc`, no `packageManager`
   field.
2. **Type-aware linting is off** — see §11.
3. **Leftover `.husky/`** directory although lefthook is the real hook manager.
   `core.hooksPath` points at `.husky/_`, where lefthook has installed its own
   shim over husky's (the original is kept as `pre-commit.old`).
4. **`apps/synapse/src-tauri/src/__commands.zip`** is committed inside the Rust
   sources.
5. **Empty CSS custom properties** in `apps/synapse/src/styles.scss`:
   `--synapse-background-color: ;` and `--synapse-foreground-color: ;`.
6. **Commented-out code** left in `app.routes.ts` (keyboard / accessory /
   streaming routes) and `src-tauri/src/lib.rs` (`devices`, `modules` commands).
   They are intent, not dead code — ask before deleting.
7. **`docs/` is empty** while `deepdocs.yml` targets it.
8. **The TS ↔ Rust contract has diverged.** `libs/backend-api` declares commands
   `devices` and `modules` and the store calls `invoke('devices', {})`, but
   `src-tauri/src/lib.rs` registers only `run_capability` and `list_devices` —
   the other two are commented out. Only the browser/mock path works today.
   `BackendCommands` is hand-written and nothing verifies it against Rust,
   so the type system cannot catch this. See `src-tauri/AGENTS.md`.
9. **`tauri.conf.json` `frontendDist` looks wrong** —
   `"../../../../dist/apps/synapse"` resolves one level above the repo root and
   omits the `browser/` subdirectory that `@angular/build:application` emits
   (compare the `serve-static` target, which uses `dist/apps/synapse/browser`).
   Unverified by an actual build. See the `package-desktop` skill.
10. **`tauri.conf.json` `identifier` is the template default** —
    `"com.tauri.dev"`. Must change before any public distribution.

---

## 14. Working agreements for agents

- **Verify, don't assume.** The test suite is too thin to catch regressions.
  Run the app or the story you changed.
- **Stay inside the requested scope.** This repo has many known rough edges
  (§13); fixing one you were not asked about turns a reviewable diff into an
  unreviewable one.
- **Prefer the skill.** `.claude/skills/` holds recipes for the flows where a
  missed step produces **no error message**:

  | Skill                  | Use it when                                                                    |
  | ---------------------- | ------------------------------------------------------------------------------ |
  | `validate`             | before reporting work done — what to run for what you changed, TS **and** Rust |
  | `new-ui-component`     | adding a widget to `libs/ui` (7 files, 2 silent registrations)                 |
  | `new-tauri-capability` | any new device read/write (6 files across Rust and TS)                         |
  | `package-desktop`      | producing the distributable bundle (there is no Docker here)                   |

- **Mock first.** The browser/mock path is the primary development mode (§7).
  Build and verify there. Extending the mock is part of the feature, never a
  follow-up. A change that only works in Tauri mode is not done.
- **Ask when the convention is ambiguous.** Several exist in two variants (§4,
  §11). Picking silently makes the inconsistency worse.
