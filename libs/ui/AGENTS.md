# AGENTS.md — `libs/ui`

The design system. Read the root `AGENTS.md` first; this file adds the rules
specific to this library.

---

## What belongs here

Generic, **product-agnostic** widgets only. A component belongs in `libs/ui` if
it would still make sense in a project that has nothing to do with Razer
peripherals.

- ✅ `button`, `card`, `checkbox`, `slider`, `switch`
- ❌ anything importing `@synapse-copycat/backend-api`
- ❌ anything that knows what a `Device` or a DPI setting is — that goes to
  `apps/synapse/src/app/core/components/`

This library must have **zero dependency on the application**. It is the UI
abstraction layer the README argues for: the point is to be able to swap the
underlying UI implementation without touching feature code.

---

## Local conventions that differ from the rest of the repo

|                    | `libs/ui`                         | Everywhere else   |
| ------------------ | --------------------------------- | ----------------- |
| Indentation        | **tabs**                          | 2 spaces          |
| Formatter / linter | **Biome** (`biome check --write`) | Prettier + ESLint |
| Selector prefix    | `syn-`                            | none / `app-`     |

The `lint` target in `project.json` is `nx:run-commands` running
`biome check --write {projectRoot}` — **it rewrites files**, unlike the ESLint
target used by the other projects. Expect `nx lint ui` to modify your working
tree.

Write tabs in this directory. Do not convert existing files to spaces.

---

## Anatomy of a component

Every component is a folder under `src/lib/<name>/` containing:

```
src/lib/switch/
  switch.ts               component class
  switch.html             template   (omit if the template is a one-liner → inline `template:`)
  switch.scss             STRUCTURE only — layout, spacing, sizing
  _switch.theme.scss      COLOURS only — a single `apply($theme)` mixin
  switch.stories.ts       Storybook
  switch.mdx              Storybook docs page
  switch.spec.ts          Vitest
```

Two registrations are required and **both are easy to forget**:

1. `src/index.ts` — add `export * from './lib/<name>/<name>';`
2. `src/styles/sdk/ui.scss` — add the `@use` and the `@include` inside
   `@mixin apply($theme)`

If you skip (1) the component is invisible to the app. If you skip (2) it
renders unthemed — no error, just wrong colours.

> `ui.scss` currently uses three different `@use` path spellings
> (`'…/button.theme'`, `'…/_card.theme'`, `'…/_switch.theme.scss'`). All work.
> For new entries use the shortest form: `@use '../../lib/<name>/<name>.theme' as <name>;`

---

## Component class

```ts
import { ChangeDetectionStrategy, Component, model } from '@angular/core';

@Component({
  selector: 'syn-switch, label[syn-switch]',
  styleUrl: './switch.scss',
  templateUrl: './switch.html',
  host: {
    '[class.switch]': 'true',
    '(click)': 'toggleState()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SwitchComponent {
  state = model(false);

  toggleState() {
    this.state.set(!this.state());
  }
}
```

- **Dual selector** — `'syn-switch, label[syn-switch]'`. Components are usable
  both as an element and as an attribute on a native element. `button` does the
  same with `'syn-button, button[synapse-button]'`. Keep this pattern: it lets
  consumers keep native semantics and accessibility.
- **`model()`** for two-way state, **`input()` / `output()`** otherwise. No
  `@Input()` / `@Output()` decorators in new code.
- **`OnPush`** always.
- **`host: {}`** in the decorator, not `@HostBinding` / `@HostListener`.
- Variants are expressed as **attributes** read from the theme file
  (`&[btn-secondary]`), not as inputs. See `_button.theme.scss`.

⚠️ Class naming is inconsistent here: `Button` and `SwitchComponent` coexist.
Use the **no-suffix** form (`Slider`, not `SliderComponent`) for new components.

---

## The two stylesheets

This split is the core of the theming SDK. Getting it wrong breaks theme
switching silently.

**`<name>.scss` — structure.** Applied via `styleUrl`, scoped to the component.
Layout, spacing, sizing, radius, font-weight. **Never a colour.**

```scss
:host {
  border-radius: 0.5rem;
  padding: 0.5rem;
  font-weight: 500;
}
```

**`_<name>.theme.scss` — colour.** A single mixin taking the theme map. It is
included _globally_, so it selects on the component's selectors, not `:host`.

```scss
@use 'sass:map';

@mixin apply($theme) {
  $primary: map.get($theme, primary);

  syn-button,
  button[synapse-button] {
    background-color: $primary;
    color: black;

    &[btn-secondary] {
      background-color: transparent;
      color: $primary;
    }
  }
}
```

Available theme map keys: `version`, `tone` (`'light'` | `'dark'`), `primary`,
`contrast`, `accent`, `background`. Read them with `map.get($theme, …)` — never
hardcode a hex value in a theme file.

Themes are built by `create-theme-light()` / `create-theme-dark()` in
`src/styles/sdk/_theme-maker.scss`, re-exported through `src/styles/_theming.scss`.

> `_theming.scss` still contains a `@debug $theme;` statement that prints on
> every build. Harmless, but remove it if you are already editing that file.

---

## Stories

Every component needs one. The Storybook config that picks them up lives in
`apps/synapse/.storybook/main.ts`, which globs `libs/ui/src/lib/**`.

```ts
import type { Meta, StoryObj } from '@storybook/angular';
import { Button } from './button';

const meta: Meta<Button> = {
  component: Button,
  title: 'UI library / Button',
};
export default meta;

type Story = StoryObj<Button>;

export const ButtonPrimary: Story = {
  name: 'Button primary',
  render: () => ({
    template: '<syn-button synapse-button>Primary</syn-button>',
  }),
};
```

- Title is always `'UI library / <Name>'`.
- Because variants are attributes rather than inputs, use
  `render: () => ({ template })` rather than `args`.
- One story per variant, with a human-readable `name`.

Run it with `pnpm exec nx run synapse:storybook` (port 4400). Chromatic picks up
visual diffs on PRs.

---

## Tests

Vitest + jsdom, config in `vite.config.mts`, setup in `src/test-setup.ts`.
`@testing-library/angular` is installed — prefer it to raw `TestBed`.

```sh
pnpm exec nx test ui
```

⚠️ **There is currently one spec in this library and it is a placeholder**
(`button.spec.ts` asserts `expect(true).toBe(true)`). Four of the five
components have no test at all. A green run here proves nothing — if you change
a component, write the real test.

What is worth testing in a design-system component: the public signal API
(`model` round-trip), host bindings, attribute variants, and accessibility
attributes on the native element.
