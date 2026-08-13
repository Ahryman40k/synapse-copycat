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
pnpm docs:dev                         # VitePress docs

# e2e (targets are inferred by the @nx/playwright plugin)
pnpm exec nx e2e synapse-e2e

# Rust — nx does not wrap these
cd apps/synapse/src-tauri
cargo check
cargo clippy --all-targets
cargo test
```

There is **no `typecheck` target** and **no `format` target**. Until one exists,
typecheck with:

```sh
pnpm exec tsc -p apps/synapse/tsconfig.app.json --noEmit
```

⚠️ **Do not run `nx format:write`** — see §11. It fights Biome and will
ping-pong `libs/ui` between tabs and spaces.

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

⚠️ **The workspace is currently inconsistent.** Two formatters coexist and the
two libraries are linted by different tools:

| Scope                                                       | Indentation                     | `lint` target runs    |
| ----------------------------------------------------------- | ------------------------------- | --------------------- |
| `libs/ui/**`                                                | **tabs**, single quotes (Biome) | `biome check --write` |
| `apps/synapse/**`, `libs/backend-api/**`, `apps/docsite/**` | **2 spaces** (Prettier)         | `@nx/eslint:lint`     |

Both `biome.json` (tabs) and `.prettierrc` + Prettier 2.6.2 are installed, and
`.vscode/extensions.json` still recommends the Prettier extension.

**Until this is unified: match the file you are editing.** Do not reformat a
file wholesale, and do not "fix" the indentation of a file you are only
partially touching — it produces unreviewable diffs and the other tool will
revert it on the next run.

Two consequences worth knowing before you run anything:

- **`nx lint ui` rewrites files.** That target is
  `nx:run-commands → biome check --write`, not a read-only check like the
  ESLint targets elsewhere. Expect a dirty tree after it runs.
- **`nx format:write` must not be used.** Nx's format command is Prettier-based
  (Prettier 2.8.8; `.prettierrc` sets no indentation, so 2 spaces), while
  `libs/ui` is Biome-formatted with tabs. Running it converts `libs/ui` to
  spaces and the next `nx lint ui` converts it back. This is almost certainly
  why the `format` step in `lefthook.yml` is commented out.

ESLint enforces `@nx/enforce-module-boundaries`; `**/src-tauri` is excluded from
ESLint entirely (Rust is linted by clippy).

---

## 12. Git workflow

- Branch naming follows `NN-short-description` (`09-add-contents`).
- Commits are conventional-commit style: `feat(synapse): …`, `ci: …`, `chore(lefthook): …`.
- `lefthook.yml` installs a `pre-commit` hook that runs lint + test + build over
  **all** projects. It is slow. Do not bypass it with `--no-verify` to work
  around a failure — fix the failure.
- **Never commit** unless explicitly asked.

---

## 13. Known issues — do not be surprised by these

_Snapshot taken 2026-08-11 on branch `09-add-contents`. Fix them deliberately,
not as drive-by changes._

1. **`pnpm install` fails** with `ERR_PNPM_IGNORED_BUILDS`, and
   `pnpm-workspace.yaml` contains literal placeholders
   (`'@swc/core': set this to true or false`) under `allowBuilds`. Because Nx
   runs a dependency check before every command, **all `nx` commands currently
   fail.** This must be fixed before anything else works.
2. **Node version is not pinned** — local `v26`, `engines` says `>=22`, CI uses
   `24`, and `@types/node` is `18.16.9`. No `.nvmrc`, no `packageManager` field.
3. **Two formatters** — see §11.
4. **Leftover `.husky/`** directory although lefthook is the real hook manager.
5. **`apps/synapse/src-tauri/src/__commands.zip`** is committed inside the Rust
   sources.
6. **Empty CSS custom properties** in `apps/synapse/src/styles.scss`:
   `--synapse-background-color: ;` and `--synapse-foreground-color: ;`.
7. **Commented-out code** left in `app.routes.ts` (keyboard / accessory /
   streaming routes) and `src-tauri/src/lib.rs` (`devices`, `modules` commands).
   They are intent, not dead code — ask before deleting.
8. **`docs/` is empty** while `deepdocs.yml` targets it.
9. **The TS ↔ Rust contract has diverged.** `libs/backend-api` declares commands
   `devices` and `modules` and the store calls `invoke('devices', {})`, but
   `src-tauri/src/lib.rs` registers only `run_capability` and `list_devices` —
   the other two are commented out. Only the browser/mock path works today.
   `BackendCommands` is hand-written and nothing verifies it against Rust,
   so the type system cannot catch this. See `src-tauri/AGENTS.md`.
10. **`tauri.conf.json` `frontendDist` looks wrong** —
    `"../../../../dist/apps/synapse"` resolves one level above the repo root and
    omits the `browser/` subdirectory that `@angular/build:application` emits
    (compare the `serve-static` target, which uses `dist/apps/synapse/browser`).
    Unverified by an actual build. See the `package-desktop` skill.
11. **`tauri.conf.json` `identifier` is the template default** —
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
