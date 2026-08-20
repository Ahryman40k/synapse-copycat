import type { Meta, StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { LowPowerModePanel } from './low-power-mode-panel';

const meta: Meta<LowPowerModePanel> = {
	// No .mdx beside this one, so Storybook generates the docs page.
	tags: ['autodocs'],
	component: LowPowerModePanel,
	title: 'Synapse application / Components / low power mode panel',
};

export default meta;
type Story = StoryObj<LowPowerModePanel>;

export const Default: Story = {
	name: 'Low power mode panel',
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		const slider = canvas.getByRole('slider', {
			name: 'Battery percentage before low power mode',
		});
		await expect(slider).toHaveValue('30');
	},
};

/** Throttling only at the very end of the charge. */
export const Late: Story = { args: { threshold: 10 } };
