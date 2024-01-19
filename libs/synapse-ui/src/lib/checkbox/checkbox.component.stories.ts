import { Meta, StoryObj } from '@storybook/angular';

import { CheckboxComponent } from './checkbox.component';

const meta: Meta<CheckboxComponent> = {
  title: 'Synapse UI / Checkbox',
  component: CheckboxComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<CheckboxComponent>;

export const Control: Story = {};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
