import type { Meta, StoryObj } from '@storybook/angular';
import { Button } from './button';

const meta: Meta<Button> = {
	component: Button,
	title: 'UI library / Button',
};

export default meta;
type Story = StoryObj<Button>;

export const ButtonPrimary: Story = {
	name: 'Button primary',
	render: () => ({
		template: '<syn-button synapse-button>Primary</syn-button>',
	}),
};

export const SecondaryPrimary: Story = {
	name: 'Button secondary',
	render: () => ({
		template: '<button synapse-button btn-secondary> Secondary 1</button>',
	}),
};
