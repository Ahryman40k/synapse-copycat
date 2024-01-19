import { Meta, StoryObj } from '@storybook/angular';

import { ButtonGroupComponent } from './button-group.component';

const meta: Meta<ButtonGroupComponent> = {
  title: 'Synapse UI / Button Group',
  component: ButtonGroupComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<ButtonGroupComponent>;

export const Control: Story = {};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
