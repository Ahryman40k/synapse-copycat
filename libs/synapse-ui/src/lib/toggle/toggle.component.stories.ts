import { Meta, StoryObj, componentWrapperDecorator } from '@storybook/angular';

import { ToggleComponent } from './toggle.component';

const meta: Meta<ToggleComponent> = {
  title: 'Synapse UI / Toggle',
  component: ToggleComponent,
  tags: ['autodocs'],

  argTypes: {
    onCheckChanged: { action: 'State toogled' },
  },

  parameters: {
    actions: {
      handles: ['mouseover', 'click .btn'],
    },
  },

  decorators: [
    componentWrapperDecorator(
      (story) =>
        `<div style="background: #111111; border-radius: 0.4em; padding: 0.7em;">${story}</div>`
    ),
  ],
};

export default meta;
type Story = StoryObj<ToggleComponent>;

export const Control: Story = {};

export const Checked: Story = {
  args: {
    checked: true,
  },
};

export const Unchecked: Story = {
  args: {
    checked: false,
  },
};

export const Disabled: Story = {
  args: {
    checked: true,
    disabled: true,
  },
};
