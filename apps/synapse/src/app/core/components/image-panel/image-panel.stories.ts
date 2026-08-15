import type { Meta, StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { ImagePanel } from './image-panel';

const meta: Meta<ImagePanel> = {
	component: ImagePanel,
	title: 'Synapse application / Components / image panel',
};

export default meta;
type Story = StoryObj<ImagePanel>;

export const Default: Story = {
	name: 'Image panel',
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('button', { name: 'default' }),
		).toHaveAttribute('aria-pressed', 'true');
		// The camera is choosing it, so there is no value to set.
		await expect(
			canvas.getByRole('slider', { name: 'White balance' }),
		).toBeDisabled();
	},
};

/** Moving any slider lands on `custom` — that is what makes it mean anything. */
export const Custom: Story = {
	name: 'Custom picture',
	args: {
		value: {
			preset: 'custom',
			brightness: 65,
			contrast: 80,
			saturation: 40,
			whiteBalance: 35,
			whiteBalanceAuto: false,
		},
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('slider', { name: 'White balance' }),
		).toBeEnabled();
	},
};
