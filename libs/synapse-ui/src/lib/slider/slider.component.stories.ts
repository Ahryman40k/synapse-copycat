import { Meta, StoryObj, componentWrapperDecorator } from '@storybook/angular';

import { SliderComponent } from './slider.component';

const meta: Meta<SliderComponent> = {
  title: 'Synapse UI / Slider',
  component: SliderComponent,
  tags: ['autodocs'],
  argTypes: {
    min: { control: 'number' },
    max: { control: 'number' },
    value: { control: 'number' }
  },
  decorators: [
    componentWrapperDecorator((story) => `<div style="background: #111111; border-radius: 0.4em;">${story}</div>`)
  ]
};

export default meta;
type Story = StoryObj<SliderComponent>;

export const Control: Story = {
};

export const Range: Story = {
  args: {
    min: 10,
    max: 60,
    value: 35,
  }
};


export const Disabled: Story = {
  args: {
    disabled: true
  }
};

