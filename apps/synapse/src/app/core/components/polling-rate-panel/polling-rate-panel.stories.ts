import type { Meta, StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { PollingRatePanel } from './polling-rate-panel';

const meta: Meta<PollingRatePanel> = {
	component: PollingRatePanel,
	title: 'Synapse application / Components / polling rate panel',
};

export default meta;
type Story = StoryObj<PollingRatePanel>;

export const Default: Story = {
	name: 'Polling rate panel',
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		// A radio group rather than three buttons — see `syn-button-group`.
		await expect(canvas.getByRole('radio', { name: '1000 Hz' })).toBeChecked();
	},
};

/** The slowest of the three, for a wireless mouse saving its battery. */
export const Slowest: Story = { args: { rate: 125 } };
