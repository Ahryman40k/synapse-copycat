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
		template: `<button synapse-button>Primary</button> `,
	}),
};
