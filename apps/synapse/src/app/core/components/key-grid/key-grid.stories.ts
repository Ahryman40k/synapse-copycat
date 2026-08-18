import type { Meta, StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { KeyGrid } from './key-grid';

const meta: Meta<KeyGrid> = {
	component: KeyGrid,
	title: 'Synapse application / Components / key grid',
};

export default meta;
type Story = StoryObj<KeyGrid>;

/**
 * A full-size ANSI keyboard, 104 keys, one radio group. ⚠️ The layout is a
 * table written here — a Razer device reports its LED matrix, never which key
 * sits in which cell.
 */
export const Default: Story = {
	name: 'Key grid',
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getAllByRole('radio')).toHaveLength(104);
	},
};

export const Selected: Story = {
	name: 'A key picked',
	args: { selected: 'KeyG' },
};

/** The dots mark keys that are no longer doing what they say. */
export const Changed: Story = {
	name: 'With reassigned keys',
	args: { selected: 'KeyG', changed: ['KeyA', 'F5', 'Space', 'Numpad0'] },
};
