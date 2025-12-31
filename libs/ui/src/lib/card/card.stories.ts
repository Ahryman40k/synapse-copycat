import type { Meta, StoryObj } from '@storybook/angular';
import { Card } from './card';

const meta: Meta<Card> = {
	component: Card,
	title: 'UI library / Card',
};

export default meta;
type Story = StoryObj<Card>;

export const Default: Story = {
	name: 'Default card',
	args: {},
	render: () => ({
		template: `<syn-card>
    <img src="assets/devices/5426-0126.png" alt="Image"  height="200px">
    <div class="container">
      <h4>
        <b>a device</b>
      </h4>
    </div>
    </syn-card>`,
	}),
};
