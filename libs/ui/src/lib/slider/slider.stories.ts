import type { Meta, StoryObj } from '@storybook/angular';
import { SliderComponent } from './slider';

const meta: Meta<SliderComponent> = {
	component: SliderComponent,
	title: 'UI library / Slider',
};

export default meta;
type Story = StoryObj<SliderComponent>;

export const Default: Story = {
	args: {},
};
