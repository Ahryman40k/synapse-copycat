import type { Meta, StoryObj } from '@storybook/angular';
import { MousePageComponent } from './mouse-page';

const meta: Meta<MousePageComponent> = {
	component: MousePageComponent,
	title: 'Synapse Application / Pages / Mouse',
};
export default meta;

type Story = StoryObj<MousePageComponent>;

export const Default: Story = {};
