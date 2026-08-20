import type { Meta, StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { WirelessPowerSavingPanel } from './wireless-power-saving-panel';

const meta: Meta<WirelessPowerSavingPanel> = {
	// No .mdx beside this one, so Storybook generates the docs page.
	tags: ['autodocs'],
	component: WirelessPowerSavingPanel,
	title: 'Synapse application / Components / wireless power saving panel',
};

export default meta;
type Story = StoryObj<WirelessPowerSavingPanel>;

export const Default: Story = {
	name: 'Wireless power saving panel',
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		const slider = canvas.getByRole('slider', {
			name: 'Idle minutes before sleep',
		});
		await expect(slider).toHaveValue('5');
	},
};

/** The longest the mouse will stay awake for. */
export const Longest: Story = { args: { sleepAfter: 15 } };
