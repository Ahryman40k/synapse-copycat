import type { Meta, StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { SOURCES_DEFAULT } from '../../models/source';
import { SourcesPanel } from './sources-panel';

const meta: Meta<SourcesPanel> = {
	// No .mdx beside this one, so Storybook generates the docs page.
	tags: ['autodocs'],
	component: SourcesPanel,
	title: 'Synapse application / Components / sources panel',
};
export default meta;

type Story = StoryObj<SourcesPanel>;

export const Default: Story = {
	name: 'What is looked for',
	args: { sources: SOURCES_DEFAULT },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('switch', { name: 'Look for Razer Chroma' }),
		).toBeChecked();
		// Nothing implements Govee, so the row is there and the switch is not.
		await expect(
			canvas.getByRole('switch', { name: 'Look for Govee' }),
		).toBeDisabled();
	},
};

/**
 * The network sweep refused. A fair thing to want on a large network, on a
 * metered link, or simply where there are no light strings.
 */
export const NoSweep: Story = {
	name: 'Network discovery off',
	args: { sources: { chroma: true, twinkly: false, govee: false } },
	play: async ({ canvasElement }) => {
		await expect(
			within(canvasElement).getByRole('switch', { name: 'Look for Twinkly' }),
		).not.toBeChecked();
	},
};
