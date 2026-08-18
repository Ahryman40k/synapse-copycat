import type { Meta, StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { AssignmentEditor } from './assignment-editor';

const meta: Meta<AssignmentEditor> = {
	component: AssignmentEditor,
	title: 'Synapse application / Components / assignment editor',
	args: { control: { id: 'button-5', label: 'Forward' } },
};

export default meta;
type Story = StoryObj<AssignmentEditor>;

export const Default: Story = {
	name: 'Assignment editor',
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('combobox', { name: 'Assign to' }),
		).toHaveValue('default');
	},
};

/** Nothing picked yet, which is how a keyboard section opens. */
export const NoControl: Story = {
	name: 'Nothing picked',
	args: { control: undefined },
};

export const KeyboardFunction: Story = {
	name: 'A key combination',
	args: { assignment: { kind: 'keyboard', keys: 'Ctrl + Alt + K' } },
};

/** The stages it moves between are set in the performance tab. */
export const Sensitivity: Story = {
	args: { assignment: { kind: 'sensitivity', action: 'clutch' } },
};

export const Disabled: Story = {
	name: 'Disabled control',
	args: { assignment: { kind: 'disabled' } },
};
