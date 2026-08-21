import type { Meta, StoryObj } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';
import { TextField } from './text-field';

const meta: Meta<TextField> = {
	component: TextField,
	title: 'UI library / TextField',
};
export default meta;

type Story = StoryObj<TextField>;

export const Default: Story = {
	name: 'Text field default',
	render: () => ({
		template:
			'<syn-text-field placeholder="Kitchen lights">Group name</syn-text-field>',
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		// Asserted on the input, not by placeholder text: the attribute is also
		// written on the host element, so a placeholder query matches twice.
		await expect(
			canvas.getByRole('textbox', { name: 'Group name' }),
		).toHaveAttribute('placeholder', 'Kitchen lights');
	},
};

export const WithValue: Story = {
	name: 'Text field with a value',
	render: () => ({
		template: '<syn-text-field value="Desk">Group name</syn-text-field>',
	}),
};

export const Disabled: Story = {
	name: 'Text field disabled',
	render: () => ({
		template:
			'<syn-text-field value="Desk" disabled>Group name</syn-text-field>',
	}),
	play: async ({ canvasElement }) => {
		await expect(within(canvasElement).getByRole('textbox')).toBeDisabled();
	},
};

/**
 * Escape puts back what was there. Worth a story rather than only a unit test:
 * the restore has to be visible in the field, not merely correct in the model.
 */
export const Abandoning: Story = {
	name: 'Text field abandoned with Escape',
	render: () => ({
		template: '<syn-text-field value="Desk">Group name</syn-text-field>',
	}),
	play: async ({ canvasElement }) => {
		const field = within(canvasElement).getByRole('textbox');

		await userEvent.type(field, ' lights');
		await expect(field).toHaveValue('Desk lights');

		await userEvent.type(field, '{Escape}');
		await expect(field).toHaveValue('Desk');
	},
};
