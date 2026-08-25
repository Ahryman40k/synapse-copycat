import type { Meta, StoryObj } from '@storybook/angular';
import { Component, signal } from '@angular/core';
import { moduleMetadata } from '@storybook/angular';
import { expect, fn, within } from 'storybook/test';
import { AppBar } from './appbar';

const meta: Meta<AppBar> = {
	component: AppBar,
	title: 'Synapse application / Components / Application Bar',
	args: {
		placeRequested: fn(),
	},
};

export default meta;
type Story = StoryObj<AppBar>;

/**
 * ⚠️ Nothing data-driven is in this bar any more, so there is nothing to seed.
 *
 * Devices went first — entries like `mouse (1)`, `mouse (2)`, a label nobody
 * can match to the thing on the desk, and a second route to a place the
 * dashboard already owned. Modules went with the `modules` command, which Rust
 * never registered; the `⋯` overflow menu went with them, because the module
 * entries were the only things that could overflow. The `Narrower than its
 * contents` story went too — the fixed places are never clipped.
 */
export const Default: Story = {
	name: 'Default Bar',
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('navigation', { name: 'Places' }),
		).toBeVisible();
		// Home is where you are until something says otherwise.
		await expect(
			canvas.getByRole('button', { name: 'Synapse' }),
		).toHaveAttribute('aria-current', 'page');
	},
};

export const All: Story = {
	name: 'Full bar',
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('button', { name: 'Effect studio' }),
		).toBeVisible();
		await expect(
			canvas.getByRole('button', { name: 'Background manager' }),
		).toBeVisible();
		await expect(
			canvas.getByRole('button', { name: 'Settings' }),
		).toBeVisible();
	},
};

// ── selection ───────────────────────────────────────────────────────────────

@Component({
	selector: 'syn-bar-story-host',
	imports: [AppBar],
	template: `
		<syn-bar [place]="place()" (placeRequested)="go($event)"></syn-bar>
		<p style="padding:1rem; font:13px system-ui; opacity:0.7">
			current: {{ place() ?? 'home' }}
		</p>
	`,
})
export class AppBarStoryHost {
	readonly place = signal<string | undefined>('home');

	go(place: string): void {
		this.place.set(place);
	}
}

/**
 * The bar does not move its own selection — it emits, and whoever owns routing
 * feeds `place` back. In the arg-driven stories above `place` is fixed, so
 * clicking looks inert; here a host closes the loop, which is what
 * `DefaultLayout` does with the Router.
 */
export const Interactive: Story = {
	name: 'Selection, wired up',
	decorators: [moduleMetadata({ imports: [AppBarStoryHost] })],
	render: () => ({ template: '<syn-bar-story-host />' }),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(await canvas.findByText(/current: home/)).toBeVisible();

		canvas.getByRole('button', { name: 'Effect studio' }).click();

		await expect(await canvas.findByText(/current: studio/)).toBeVisible();
		await expect(
			canvas.getByRole('button', { name: 'Effect studio' }),
		).toHaveAttribute('aria-current', 'page');
	},
};

/**
 * The state the bar did not have: which page you are on. Marked with
 * `aria-current="page"` and an underline — the page bar uses a filled pill, so
 * the two levels of navigation stay told apart while sharing the same colour.
 */
export const CurrentEntry: Story = {
	name: 'Current entry',
	args: { place: 'backgrounds' },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('button', { name: 'Background manager' }),
		).toHaveAttribute('aria-current', 'page');
		await expect(
			canvas.getByRole('button', { name: 'Synapse' }),
		).not.toHaveAttribute('aria-current');

		// Exactly one entry is ever current.
		await expect(canvasElement.querySelectorAll('[aria-current]')).toHaveLength(
			1,
		);
	},
};

/**
 * The bar is drawn on `surface`; the page bar on `surface-container`. The
 * application bar is therefore always the darker of the two, whatever colour
 * the connected device reports — lightness comes from the tone ladder, never
 * from the source colour.
 */
export const AgainstThePageBar: Story = {
	name: 'Depth against the page bar',
	args: { place: 'home' },
	render: (args) => ({
		props: args,
		template: `
			<syn-bar [place]="place"></syn-bar>
			<div style="background: var(--syn-surface-container); padding: 0.375rem; display: flex; gap: 0.25rem">
				<button style="padding:0.625rem 1.25rem; border:0; border-radius:999px; font:inherit; font-weight:900; text-transform:uppercase; background:var(--syn-primary); color:var(--syn-on-primary)">customize</button>
				<button style="padding:0.625rem 1.25rem; border:0; border-radius:999px; font:inherit; font-weight:900; text-transform:uppercase; background:none; color:var(--syn-on-surface-variant)">lighting</button>
			</div>
			<div style="background: var(--syn-surface); height: 4rem"></div>
		`,
	}),
};
