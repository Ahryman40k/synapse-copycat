import { Meta, StoryObj } from '@storybook/angular';

import { ToggleComponent } from './toggle.component';

const meta: Meta<ToggleComponent> = {
  title: 'Synapse UI / Toggle',
  component: ToggleComponent,
  tags: ['autodocs'],
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' }
  }
};

export default meta;
type Story = StoryObj<ToggleComponent>;

export const Control: Story = {
};

export const Checked: Story = {
  args: {
    checked: true
  }
};

export const Unchecked: Story = {
  args: {
    checked: false
  }
};

export const Disabled: Story = {
  args: {
    disabled: true
  }
};

