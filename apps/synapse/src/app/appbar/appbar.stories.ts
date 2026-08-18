import type { Device, Module } from '@synapse-copycat/backend-api';
import type { Meta, StoryObj } from '@storybook/angular';
import { Component, signal } from '@angular/core';
import { componentWrapperDecorator, moduleMetadata } from '@storybook/angular';
import { expect, fn, within } from 'storybook/test';
import { AppBar } from './appbar';

const meta: Meta<AppBar> = {
	component: AppBar,
	title: 'Synapse application / Components / Application Bar',
	args: {
		deviceActivated: fn(),
		moduleActivated: fn(),
		homeRequested: fn(),
	},
};

export default meta;
type Story = StoryObj<AppBar>;

const devices = [
	{
		__type: 'device',
		kind: 'mouse',
		name: 'Razer Basilisk Ultimate',
		id: '5426-0136',
		visual: 'assets/devices/5426-0136.png',
	},
	{
		__type: 'device',
		kind: 'mouse',
		name: 'Razer Viper V2 Pro',
		id: '5426-0165',
		visual: 'assets/devices/5426-0165.png',
	},
	{
		__type: 'device',
		kind: 'accessory',
		name: 'Razer Basilisk Ultimate (dock)',
		id: '5426-0126',
		visual: 'assets/devices/5426-0126.png',
	},
	{
		__type: 'device',
		kind: 'keyboard',
		name: 'Razer Huntsman elite',
		id: '5426-0550',
		visual: 'assets/devices/5426-0550.png',
	},
	{
		__type: 'device',
		kind: 'mousemat',
		name: 'Razer Goliathus',
		id: '5426-3074',
		visual: 'assets/devices/5426-3074.png',
	},
	{
		__type: 'device',
		kind: 'streaming',
		name: 'Razer Kiyo',
		id: '5426-3587',
		visual: 'assets/devices/5426-3587.png',
	},
] satisfies Device[];

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
] satisfies Module[];

/** Nothing connected yet — the state the app opens in before enumeration. */
export const Default: Story = {
	name: 'Default Bar',
	args: { devices: [], modules: [] },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('navigation', { name: 'Devices and modules' }),
		).toBeVisible();
		// With no device open, Home is where you are.
		await expect(
			canvas.getByRole('button', { name: 'Synapse' }),
		).toHaveAttribute('aria-current', 'page');
	},
};

export const DeviceOnly: Story = {
	name: 'With only devices',
	args: { devices, modules: [] },
};

export const ModuleOnly: Story = {
	name: 'With only modules',
	args: { devices: [], modules },
};

export const All: Story = {
	name: 'Full bar',
	args: { devices, modules },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		// Two mice, so the kind is numbered; nothing else is.
		await expect(
			canvas.getByRole('button', { name: 'mouse (1)' }),
		).toBeVisible();
		await expect(
			canvas.getByRole('button', { name: 'mouse (2)' }),
		).toBeVisible();
		await expect(
			canvas.getByRole('button', { name: 'mousemat' }),
		).toBeVisible();

		// The full name stays reachable without overriding the visible label.
		await expect(
			canvas.getByRole('button', { name: 'mouse (2)' }),
		).toHaveAttribute('title', 'Razer Viper V2 Pro');
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
	args: { devices, modules },
	decorators: [
		componentWrapperDecorator(
			(story) =>
				`<div style="width: 360px; outline: 1px dashed rgb(128 128 128 / 0.5)">${story}</div>`,
		),
	],
};

// ── selection ───────────────────────────────────────────────────────────────

@Component({
	selector: 'syn-bar-story-host',
	imports: [AppBar],
	template: `
		<syn-bar
			[devices]="devices"
			[modules]="modules"
			[activeId]="activeId()"
			(homeRequested)="activeId.set(undefined)"
			(deviceActivated)="activeId.set($event.id)"
			(moduleActivated)="activeId.set($event.kind)"
		></syn-bar>
		<p style="padding:1rem; font:13px system-ui; opacity:0.7">
			current: {{ activeId() ?? 'home' }}
		</p>
	`,
})
export class AppBarStoryHost {
	readonly devices = devices;
	readonly modules = modules;
	readonly activeId = signal<string | undefined>(undefined);
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

		canvas.getByRole('button', { name: 'mousemat' }).click();

		await expect(await canvas.findByText(/current: 5426-3074/)).toBeVisible();
		await expect(
			canvas.getByRole('button', { name: 'mousemat' }),
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
	args: { devices, modules, activeId: '5426-3074' },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('button', { name: 'mousemat' }),
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
	args: { devices, modules, activeId: '5426-0136' },
	render: (args) => ({
		props: args,
		template: `
			<syn-bar
				[devices]="devices"
				[modules]="modules"
				[activeId]="activeId"
			></syn-bar>
			<div style="background: var(--syn-surface-container); padding: 0.375rem; display: flex; gap: 0.25rem">
				<button style="padding:0.625rem 1.25rem; border:0; border-radius:999px; font:inherit; font-weight:900; text-transform:uppercase; background:var(--syn-primary); color:var(--syn-on-primary)">customize</button>
				<button style="padding:0.625rem 1.25rem; border:0; border-radius:999px; font:inherit; font-weight:900; text-transform:uppercase; background:none; color:var(--syn-on-surface-variant)">lighting</button>
			</div>
			<div style="background: var(--syn-surface); height: 4rem"></div>
		`,
	}),
};
