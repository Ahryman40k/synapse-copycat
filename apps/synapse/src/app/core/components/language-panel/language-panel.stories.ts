import type { Meta, StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { LanguagePanel } from './language-panel';

const meta: Meta<LanguagePanel> = {
	// No .mdx beside this one, so Storybook generates the docs page.
	tags: ['autodocs'],
	component: LanguagePanel,
	title: 'Synapse application / Components / language panel',
};
export default meta;

type Story = StoryObj<LanguagePanel>;

/** One entry, and the list is the shape a second language will need. */
export const Default: Story = {
	name: 'Language panel',
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('combobox', { name: 'Interface language' }),
		).toHaveValue('en');
		await expect(canvas.getAllByRole('option')).toHaveLength(1);
	},
};
