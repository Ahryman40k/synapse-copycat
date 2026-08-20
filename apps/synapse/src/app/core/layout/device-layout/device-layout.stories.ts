import type { Device } from '@synapse-copycat/backend-api';
import type { Meta, StoryObj } from '@storybook/angular';
import { Component, signal } from '@angular/core';
import { moduleMetadata } from '@storybook/angular';
import { expect, waitFor, within } from 'storybook/test';
import { BrightnessPanelComponent } from '../../components/brightness-panel/brightness-panel';
import { EffectsPanel } from '../../components/effects-panel/effects-panel';
import { LightingSwitchOffPanelComponent } from '../../components/lighting-switch-off-panel/lighting-switch-off-panel';
import { DeviceLayout } from './device-layout';

const DEVICE: Device = {
	__type: 'device',
	kind: 'mousemat',
	id: '5426-3074',
	name: 'Goliatus Extended',
	visual: 'assets/devices/5426-3074.png',
};

const meta: Meta<DeviceLayout> = {
	// No .mdx beside this one, so Storybook generates the docs page.
	tags: ['autodocs'],
	component: DeviceLayout,
	title: 'Synapse application / Templates / device layout',
	decorators: [
		moduleMetadata({
			imports: [
				BrightnessPanelComponent,
				LightingSwitchOffPanelComponent,
				EffectsPanel,
			],
		}),
	],
	args: { device: DEVICE },
};

export default meta;
type Story = StoryObj<DeviceLayout>;

/** What a lighting section looks like: the portrait, then three panels. */
export const ThreePanels: Story = {
	name: 'Three panels',
	render: (args) => ({
		props: args,
		template: `
			<device-layout [device]="device">
				<brightness-panel></brightness-panel>
				<effects-panel></effects-panel>
				<lighting-switch-off-panel></lighting-switch-off-panel>
			</device-layout>
		`,
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('img', { name: 'Goliatus Extended' }),
		).toBeVisible();
		// Present and named, not *visible*: the native control is deliberately
		// invisible — the pill beside it is what is seen — and a real browser,
		// unlike jsdom, computes that.
		await expect(
			canvas.getByRole('switch', { name: 'Brightness' }),
		).toBeInTheDocument();
		await expect(
			canvas.getByRole('combobox', { name: 'Lighting effect' }),
		).toBeVisible();
	},
};

/** Panels are projected, so a section adds or drops one on its own. */
export const OnePanel: Story = {
	name: 'One panel',
	render: (args) => ({
		props: args,
		template: `
			<device-layout [device]="device">
				<brightness-panel></brightness-panel>
			</device-layout>
		`,
	}),
};

// ── the panel order, measured ───────────────────────────────────────────────

/**
 * A lighting section in full, with the one panel here that changes height.
 *
 * Exists to be measured rather than looked at: see `PanelsHoldStill`.
 */
@Component({
	selector: 'device-layout-story-host',
	imports: [
		DeviceLayout,
		BrightnessPanelComponent,
		EffectsPanel,
		LightingSwitchOffPanelComponent,
	],
	template: `
		<device-layout [device]="device">
			<brightness-panel></brightness-panel>
			<effects-panel [(effect)]="effect"></effects-panel>
			<lighting-switch-off-panel></lighting-switch-off-panel>
		</device-layout>
	`,
})
export class DeviceLayoutStoryHost {
	readonly device = DEVICE;
	readonly effect = signal<'spectrum' | 'breathe'>('spectrum');
}

/**
 * The switch-off panel must not move when an effect is chosen.
 *
 * This is the whole reason `effect-settings-panel` is a panel of its own and
 * renders fourth. The panels share one grid, and a grid row is as tall as its
 * tallest panel: while these controls lived inside the effects panel, choosing
 * `breathe` grew row 1 and pushed the switch — which sits in row 2 — down the
 * page. Fourth, it grows in the last row with nothing below it.
 *
 * Only a real browser can catch this. jsdom reports 0 for every measurement,
 * so this cannot be a spec.
 */
export const PanelsHoldStill: Story = {
	name: 'Masonry: panels pack, and hold still',
	decorators: [moduleMetadata({ imports: [DeviceLayoutStoryHost] })],
	render: () => ({
		// Wide enough for the two-column layout, which is where the coupling is.
		template: `<div style="width:64rem"><device-layout-story-host /></div>`,
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const box = (selector: string) =>
			(
				canvasElement.querySelector(selector) as HTMLElement
			).getBoundingClientRect();

		const GAP = 16; // 1em at the default 16px root

		// ── it packs ────────────────────────────────────────────────────────
		//
		// The switch sits under the brightness panel, against it — not against
		// the bottom of the taller effects panel beside it. That difference is
		// the whole point of the masonry.
		await waitFor(() => {
			const gap =
				box('lighting-switch-off-panel').top - box('brightness-panel').bottom;
			if (Math.abs(gap - GAP) > 2) {
				throw new Error(`packed to ${gap}px, expected ${GAP}px`);
			}
		});

		// ── and it holds still ──────────────────────────────────────────────
		const before = box('lighting-switch-off-panel').top;

		const select = canvas.getByRole('combobox', {
			name: 'Lighting effect',
		}) as HTMLSelectElement;
		select.value = 'breathe';
		select.dispatchEvent(new Event('change'));

		// Present, not visible: the native checkbox is deliberately invisible.
		await waitFor(() => {
			if (!canvasElement.querySelector('.effects-panel__breathe')) {
				throw new Error('breathe controls not rendered yet');
			}
		});
		await expect(
			canvas.getByRole('checkbox', { name: 'Random' }),
		).toBeInTheDocument();
		await expect(box('lighting-switch-off-panel').top).toBe(before);
	},
};
