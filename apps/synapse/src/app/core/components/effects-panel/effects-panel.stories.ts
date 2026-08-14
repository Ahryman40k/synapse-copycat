import type { Meta, StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { EffectsPanel } from './effects-panel';

const meta: Meta<EffectsPanel> = {
	component: EffectsPanel,
	title: 'Synapse application / Components / effects panel',
};

export default meta;
type Story = StoryObj<EffectsPanel>;

export const Default: Story = {
	name: 'Effects Panel',
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		// Uppercased by the stylesheet, so the accessible name stays "Effects" —
		// a screen reader should not spell it out letter by letter.
		await expect(
			canvas.getByRole('heading', { name: 'Effects' }),
		).toBeVisible();

		const control = canvas.getByRole('combobox', { name: 'Lighting effect' });
		await expect(control).toHaveValue('spectrum');

		// Only the effects the Rust backend implements.
		await expect(
			canvas.getAllByRole('option').map((option) => option.textContent?.trim()),
		).toEqual(['None', 'Static', 'Spectrum', 'Wave', 'Breathe']);
	},
};

export const Static: Story = {
	name: 'A single colour',
	args: { effect: 'static' },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByRole('combobox')).toHaveValue('static');
	},
};
