import { Meta, StoryObj } from '@storybook/angular';

import { MousematPageComponent } from './mousemat-page.component';

const meta: Meta<MousematPageComponent> = {
  title: 'Pages / Mousemat Page',
  component: MousematPageComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<MousematPageComponent>;

export const DefaultPage: Story = {};
