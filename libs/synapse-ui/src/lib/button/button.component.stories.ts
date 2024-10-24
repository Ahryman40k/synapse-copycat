import { Meta, StoryObj } from '@storybook/angular';

import { ButtonComponent } from './button.component';

const meta: Meta<ButtonComponent> = {
  title: 'Synapse UI / Button',
  component: ButtonComponent,
  // tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<ButtonComponent>;

export const Default: Story = {
  render: (args) => ({
    props: args,
    template: `<button synapseButton>Simple</button>`,
  }),
};
