import type { Meta, StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { SnapTapPanel } from './snap-tap-panel';

const meta: Meta<SnapTapPanel> = {
	// No .mdx beside this one, so Storybook generates the docs page.
	tags: ['autodocs'],
	component: SnapTapPanel,
	title: 'Synapse application / Components / snap tap panel',
};

export default meta;
type Story = StoryObj<SnapTapPanel>;

export const Default: Story = {
	name: 'Snap tap panel',
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('switch', { name: 'Snap Tap' }),
		).not.toBeChecked();
	},
};

export const On: Story = {
	name: 'Switched on',
	args: { activated: true },
};
