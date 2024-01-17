
import { Meta, StoryObj } from '@storybook/angular';

import { ButtonComponent } from './button.component';

const meta: Meta<ButtonComponent> = {
  title: 'Synapse UI / Button',
  component: ButtonComponent,
  tags: ['autodocs'],
 
};

export default meta;
type Story = StoryObj<ButtonComponent>;

export const Control: Story = {
};


export const Disabled: Story = {
  args: {
    disabled: true
  }
};

