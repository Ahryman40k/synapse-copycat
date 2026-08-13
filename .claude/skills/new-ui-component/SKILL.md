---
name: new-ui-component
description: Create a new design-system component in libs/ui with the full house convention — component class, structure stylesheet, theme mixin, story, docs page, spec, and the two registrations (index.ts barrel + ui.scss theme aggregator) that are silently easy to forget. Use whenever adding a reusable widget to libs/ui, or when a component renders unthemed / cannot be imported from @synapse-copycat/ui.
---

# New `libs/ui` component

A component here is **seven files and two registrations**. Skipping a
registration fails silently: forget the barrel and the component cannot be
imported; forget the theme aggregator and it renders with no colours and no
error.

## Before you start

Confirm it belongs in `libs/ui`: the component must be **product-agnostic**. If
it knows what a `Device`, a DPI value or a Razer peripheral is, it belongs in
`apps/synapse/src/app/core/components/` instead — stop and put it there.

Read `libs/ui/AGENTS.md` if you have not already.

**Indentation follows the file type**, not the directory: `.ts` is tabs (Biome),
`.scss` and `.html` are 2 spaces (Prettier). `pnpm format` applies both.

**The `syn-` selector prefix is enforced by ESLint** here — including on any
Storybook helper component you declare inside a `.stories.ts`. Name those
`syn-<component>-story-host`.

## Steps

### 1. Create the folder

`libs/ui/src/lib/<name>/` with these files. Use `switch` and `button` as the
reference implementations — read them before writing.

```
<name>.ts               component class
<name>.html             template (omit if one line → use inline `template:`)
<name>.scss             STRUCTURE only: layout, spacing, sizing. No colours.
_<name>.theme.scss      COLOUR only: a single `apply($theme)` mixin
<name>.stories.ts       Storybook
<name>.mdx              Storybook docs page
<name>.spec.ts          Vitest
```

### 2. Component class

```ts
import { ChangeDetectionStrategy, Component, model } from '@angular/core';

@Component({
	selector: 'syn-<name>, <native-el>[syn-<name>]',
	templateUrl: './<name>.html',
	styleUrl: './<name>.scss',
	host: {
		'[class.<name>]': 'true',
	},
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class <Name> {
	value = model(<default>);
}
```

Non-negotiable in this library:

- **Dual selector** — element form _and_ attribute form on a sensible native
  element, so consumers keep native semantics and accessibility
  (`'syn-button, button[synapse-button]'`, `'syn-switch, label[syn-switch]'`).
- **`model()`** for two-way state, `input()` / `output()` otherwise. No
  `@Input()` / `@Output()` decorators.
- **`OnPush`**, always.
- **`host: {}`** in the decorator — not `@HostBinding` / `@HostListener`.
- **No suffix** on the class name: `Slider`, not `SliderComponent`.
- Variants are **attributes** matched in the theme file (`&[btn-secondary]`),
  not inputs.

### 3. The two stylesheets

Keep the split strictly. `<name>.scss` is component-scoped and holds **no
colour**:

```scss
:host {
  display: inline-flex;
  padding: 0.5rem;
  border-radius: 0.5rem;
}
```

`_<name>.theme.scss` is included globally, so it selects on the component's
selectors rather than `:host`, and reads every colour from the theme map:

```scss
@use 'sass:map';

@mixin apply($theme) {
  $primary: map.get($theme, primary);

  syn-<name >,
  <native-el > [syn-<name>] {
    background-color: $primary;

    &[<variant-attr>] {
      background-color: transparent;
      color: $primary;
    }
  }
}
```

Theme map keys: `version`, `tone` (`'light'` | `'dark'`), `primary`, `contrast`,
`accent`, `background`. **Never hardcode a hex value in a theme file** — if you
need a colour that is not in the map, add it to `_theme-maker.scss` instead.

### 4. Registration 1 — the barrel

`libs/ui/src/index.ts`, keeping alphabetical order:

```ts
export * from './lib/<name>/<name>';
```

### 5. Registration 2 — the theme aggregator

`libs/ui/src/styles/sdk/ui.scss`. **Both** lines are required:

```scss
@use '../../lib/<name>/<name>.theme' as <name>;

@mixin apply($theme) {
  // …existing includes…
  @include <name>.apply($theme);
}
```

### 6. Story

```ts
import type { Meta, StoryObj } from '@storybook/angular';
import { <Name> } from './<name>';

const meta: Meta<<Name>> = {
	component: <Name>,
	title: 'UI library / <Name>',
};
export default meta;

type Story = StoryObj<<Name>>;

export const Default: Story = {
	name: '<Name> default',
	render: () => ({ template: '<syn-<name>></syn-<name>>' }),
};
```

Title is always `'UI library / <Name>'`. One story per variant. Use
`render: () => ({ template })` rather than `args`, since variants are attributes.

### 7. A real spec

Do **not** copy `button.spec.ts` — it is a placeholder asserting
`expect(true).toBe(true)` and it is the reason this library has no effective
coverage. Use `@testing-library/angular` and test:

- the `model()` round-trip (set from outside, mutate from inside, both observed)
- host bindings and attribute variants
- accessibility attributes on the underlying native element

## Verify

```sh
pnpm exec nx test ui
pnpm exec nx lint ui                  # note: biome --write, it rewrites files
pnpm exec nx run synapse:storybook    # port 4400 — check it renders *themed*
```

The Storybook check is the one that catches a missed step 5: the component
appears, but in default browser colours.

## Report back

State explicitly which of the two registrations you made, and whether the
component rendered themed in Storybook. If you could not run Storybook, say so
rather than implying it was verified.
