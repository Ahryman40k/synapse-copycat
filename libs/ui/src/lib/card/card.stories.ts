import type { Meta, StoryObj } from '@storybook/angular';
import { Card } from './card';

const meta: Meta<Card> = {
  component: Card,
  title: 'UI library / Card',
};

export default meta;
type Story = StoryObj<Card>;

export const Default: Story = {
  name: 'Default card',
  args: {},
};

export const DeviceCard: Story = {
  args: {},
  render: () => ({
    template: `<syn-card>
    <div style="display: flex; flex-direction:column; justify-content:center; align-items:center;">
      <img src="assets/devices/5426-0126.png" alt="Image"  height="200px">
      <div class="container">
        <h4>
          <b>a device</b>
        </h4>
      </div>
    </div>
    </syn-card>`,
  }),
};
