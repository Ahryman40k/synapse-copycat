import { Meta, StoryObj } from '@storybook/angular';

import { DeviceCardComponent } from './device-card.component';

const meta: Meta<DeviceCardComponent> = {
  title: 'Components / Device Card',
  component: DeviceCardComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<DeviceCardComponent>;

export const Mouse: Story = {
  args: {
    device: {
      __type: 'device',
      group: 'usb',
      kind: 'mouse',
      name: 'Razer Basilisk Ultimate',
      visual: 'assets/devices/razer-basilisk-ultimate.png',
      id: '3204',
    },
  },
};

export const Camera: Story = {
  args: {
    device: {
      __type: 'device',
      group: 'usb',
      kind: 'camera',
      name: 'Razer Kiyo',
      visual: './assets/devices/razer-kiyo.png',
      id: '3205',
    },
  },
};
export const Twinkly: Story = {
  args: {
    device: {
      __type: 'device',
      group: 'connected',
      kind: 'twinkly',
      name: 'Twinkly',
      visual: './assets/devices/twinkly.png',
    },
  },
};
