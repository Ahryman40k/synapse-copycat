import { Meta, StoryObj } from '@storybook/angular';

import { AccessoryPageComponent } from './accessory-page.component';

const meta: Meta<AccessoryPageComponent> = {
  title: 'Pages / Accessory Page',
  component: AccessoryPageComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<AccessoryPageComponent>;

export const DefaultPage: Story = {};
