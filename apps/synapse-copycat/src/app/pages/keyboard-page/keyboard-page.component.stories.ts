import { Meta, StoryObj } from '@storybook/angular';

import { KeyboardPageComponent } from './keyboard-page.component';

const meta: Meta<KeyboardPageComponent> = {
  title: 'Pages / Keyboard Page',
  component: KeyboardPageComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<KeyboardPageComponent>;

export const DefaultPage: Story = {};
