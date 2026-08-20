import type { Meta, StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { SensitivityPanel } from './sensitivity-panel';

const meta: Meta<SensitivityPanel> = {
	// No .mdx beside this one, so Storybook generates the docs page.
	tags: ['autodocs'],
	component: SensitivityPanel,
	title: 'Synapse application / Components / sensitivity panel',
};

export default meta;
type Story = StoryObj<SensitivityPanel>;

/** One value over the whole range of the sensor. */
export const Default: Story = {
	name: 'Sensitivity panel',
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getAllByRole('slider')).toHaveLength(1);
		await expect(canvas.getByRole('slider', { name: 'DPI' })).toHaveValue(
			'9700',
		);
	},
};

/**
 * Five stages the mouse cycles between. Each is held by its neighbours, so
 * they cannot be dragged out of order.
 */
export const Staged: Story = {
	name: 'Sensitivity stages',
	args: {
		value: { staged: true, dpi: 9700, stages: [850, 1800, 4000, 9700, 20000] },
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getAllByRole('slider')).toHaveLength(5);

		// Every stage keeps the sensor's whole scale, so the five can be read
		// against each other; it is the thumb that stops at the neighbours.
		const third = canvas.getByRole('slider', { name: 'Stage 3 DPI' });
		await expect(third).toHaveAttribute('min', '100');
		await expect(third).toHaveAttribute('max', '20000');
	},
};
