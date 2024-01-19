import { Meta, StoryObj } from '@storybook/angular';

import { BrightnessControlComponent } from './brightness-control.component';

const meta: Meta<BrightnessControlComponent> = {
  title: 'Components / Device Controls / Brightness',
  component: BrightnessControlComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<BrightnessControlComponent>;

export const Control: Story = {};
