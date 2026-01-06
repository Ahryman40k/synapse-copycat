import type { Meta, StoryObj } from '@storybook/angular';
import { CheckboxComponent } from './checkbox';

const meta: Meta<CheckboxComponent> = {
  component: CheckboxComponent,
  title: 'UI library / Checkbox',
};

export default meta;
type Story = StoryObj<CheckboxComponent>;

export const Default: Story = {
  render: () => ({
    template: `<syn-checkbox>Checkbox</syn-checkbox>`,
  }),
};
