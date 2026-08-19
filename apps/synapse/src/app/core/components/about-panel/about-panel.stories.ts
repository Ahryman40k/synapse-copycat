import type { Meta, StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { AboutPanel } from './about-panel';

const meta: Meta<AboutPanel> = {
	component: AboutPanel,
	title: 'Synapse application / Components / about panel',
};
export default meta;

type Story = StoryObj<AboutPanel>;

export const Default: Story = {
	name: 'About panel',
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('link', { name: /synapse-copycat/ }),
		).toHaveAttribute('rel', expect.stringContaining('noopener'));
		// Nothing supplies a version, so none is claimed.
		await expect(canvas.queryByText(/Version/)).not.toBeInTheDocument();
	},
};

/** What it will look like once something reports a version. */
export const WithVersion: Story = {
	name: 'With a version',
	args: { version: '0.1.0' },
};
