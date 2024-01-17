
import { Meta, StoryObj } from '@storybook/angular';

import { SelectComponent } from './select.component';

const meta: Meta<SelectComponent> = {
  title: 'Synapse UI / Select',
  component: SelectComponent,
  tags: ['autodocs'],
 
};

export default meta;
type Story = StoryObj<SelectComponent>;

export const Control: Story = {
};


export const Disabled: Story = {
  args: {
    disabled: true
  }
};

