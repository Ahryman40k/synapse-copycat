import type { Module } from '@synapse-copycat/backend-api';
import type { Meta, StoryObj } from '@storybook/angular';
import { Component, signal } from '@angular/core';
import { componentWrapperDecorator, moduleMetadata } from '@storybook/angular';
import { expect, fn, within } from 'storybook/test';
import { AppBar } from './appbar';

const meta: Meta<AppBar> = {
	component: AppBar,
	title: 'Synapse application / Components / Application Bar',
	args: {
		moduleActivated: fn(),
		placeRequested: fn(),
	},
};

export default meta;
type Story = StoryObj<AppBar>;

/**
 * ⚠️ No devices here. They were entries in this bar — `mouse (1)`, `mouse (2)`
 * — and are not any more: the label could not be matched to the thing on the
 * desk, and the dashboard already owned that job. Modules stay, because nothing
 * else shows them.
 */
const modules = [
	{
		__type: 'module',
		name: 'Twinkly',
		kind: 'twinkly',
		visual: 'assets/modules/twinkly.png',
	},
	{
		__type: 'module',
		name: 'Goove',
		kind: 'goove',
		visual: 'assets/modules/goove.png',
	},
	{
		__type: 'module',
		name: 'Nanoleaf',
		kind: 'nanoleaf',
		visual: 'assets/modules/nanoleaf.png',
	},
] satisfies Module[];

/** Nothing connected yet — the state the app opens in before enumeration. */
export const Default: Story = {
	name: 'Default Bar',
	args: { modules: [] },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('navigation', { name: 'Modules' }),
		).toBeVisible();
		// With no device open, Home is where you are.
		await expect(
			canvas.getByRole('button', { name: 'Synapse' }),
		).toHaveAttribute('aria-current', 'page');
	},
};

export const All: Story = {
	name: 'Full bar',
	args: { modules },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByRole('button', { name: 'twinkly' })).toBeVisible();
		await expect(canvas.getByRole('button', { name: 'goove' })).toBeVisible();

		// The full name stays reachable without overriding the visible label.
		await expect(
			canvas.getByRole('button', { name: 'twinkly' }),
		).toHaveAttribute('title', 'Twinkly');
	},
};

/**
 * Too narrow for its entries. What does not fit moves into the `⋯` menu rather
 * than scrolling out of sight — a hidden scrollbar cannot be reached with the
 * mouse, and a visible one would eat a third of a 2.5em bar. Open the menu and
 * pick from it.
 */
export const Narrow: Story = {
	name: 'Narrower than its contents',
	args: { modules },
	decorators: [
		componentWrapperDecorator(
			(story) =>
				`<div style="width: 220px; outline: 1px dashed rgb(128 128 128 / 0.5)">${story}</div>`,
		),
	],
};

// ── selection ───────────────────────────────────────────────────────────────

@Component({
	selector: 'syn-bar-story-host',
	imports: [AppBar],
	template: `
		<syn-bar
			[modules]="modules"
			[activeId]="activeId()"
			[place]="place()"
			(placeRequested)="go($event)"
			(moduleActivated)="open($event.kind)"
		></syn-bar>
		<p style="padding:1rem; font:13px system-ui; opacity:0.7">
			current: {{ activeId() ?? 'home' }}
		</p>
	`,
})
export class AppBarStoryHost {
	readonly modules = modules;
	readonly activeId = signal<string | undefined>(undefined);
	readonly place = signal<string | undefined>('home');

	go(place: string): void {
		this.activeId.set(undefined);
		this.place.set(place);
	}

	open(kind: string): void {
		// No fixed place is current while a module is open.
		this.place.set(undefined);
		this.activeId.set(kind);
	}
}

/**
 * The bar does not move its own selection — it emits, and whoever owns routing
 * feeds `activeId` back. In the arg-driven stories above `activeId` is fixed,
 * so clicking looks inert; here a host closes the loop, which is what
 * `DefaultLayout` does with the Router.
 */
export const Interactive: Story = {
	name: 'Selection, wired up',
	decorators: [moduleMetadata({ imports: [AppBarStoryHost] })],
	render: () => ({ template: '<syn-bar-story-host />' }),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(await canvas.findByText(/current: home/)).toBeVisible();

		canvas.getByRole('button', { name: 'goove' }).click();

		await expect(await canvas.findByText(/current: goove/)).toBeVisible();
		await expect(canvas.getByRole('button', { name: 'goove' })).toHaveAttribute(
			'aria-current',
			'page',
		);
	},
};

/**
 * The state the bar did not have: which page you are on. Marked with
 * `aria-current="page"` and an underline — the page bar uses a filled pill, so
 * the two levels of navigation stay told apart while sharing the same colour.
 */
export const CurrentEntry: Story = {
	name: 'Current entry',
	args: { modules, activeId: 'goove', place: undefined },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByRole('button', { name: 'goove' })).toHaveAttribute(
			'aria-current',
			'page',
		);
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
	args: { modules, activeId: 'twinkly', place: undefined },
	render: (args) => ({
		props: args,
		template: `
			<syn-bar [modules]="modules" [activeId]="activeId"></syn-bar>
			<div style="background: var(--syn-surface-container); padding: 0.375rem; display: flex; gap: 0.25rem">
				<button style="padding:0.625rem 1.25rem; border:0; border-radius:999px; font:inherit; font-weight:900; text-transform:uppercase; background:var(--syn-primary); color:var(--syn-on-primary)">customize</button>
				<button style="padding:0.625rem 1.25rem; border:0; border-radius:999px; font:inherit; font-weight:900; text-transform:uppercase; background:none; color:var(--syn-on-surface-variant)">lighting</button>
			</div>
			<div style="background: var(--syn-surface); height: 4rem"></div>
		`,
	}),
};
