import type { Device } from '@synapse-copycat/backend-api';
import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { expect, within } from 'storybook/test';
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
				<lighting-switch-off-panel></lighting-switch-off-panel>
				<effects-panel></effects-panel>
			</device-layout>
		`,
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('img', { name: 'Goliatus Extended' }),
		).toBeVisible();
		await expect(
			canvas.getByRole('switch', { name: 'Brightness' }),
		).toBeVisible();
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
