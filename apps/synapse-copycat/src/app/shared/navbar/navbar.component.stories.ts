import { Meta, StoryObj } from '@storybook/angular';
import { Device, UsbDeviceSchema } from '../../models';

import { NavbarComponent } from './navbar.component';

import { z } from 'zod';

export const UsbDeviceRepositorySchema = z.object({
  name: z.string(),
  visual: z.string(),
  kind: UsbDeviceSchema,
  id: z.string(),
});

//const a = extractUsbDevice(t, '', '453');

const usbDevices: Device[] = [
  {
    __type: 'device',
    group: 'usb',
    kind: 'keyboard',
    name: 'Razer Huntsman Elite',
    visual: './assets/images/razer-logo.svg',
    id: '3201',
  },
  {
    __type: 'device',
    group: 'usb',
    kind: 'streaming',
    name: 'Razer Kiyo',
    visual: './assets/images/razer-logo.svg',
    id: '3202',
  },
  {
    __type: 'device',
    group: 'usb',
    kind: 'mousemat',
    name: 'Razer Goliathus extended Chroma',
    visual: './assets/images/razer-logo.svg',
    id: '3203',
  },
  {
    __type: 'device',
    group: 'usb',
    kind: 'mouse',
    name: 'Razer Basilisk Ultimate',
    visual: 'assets/devices/razer-basilisk-ultimate.png',
    id: '3204',
  },
];

const connectedDevices: Device[] = [
  {
    __type: 'device',
    group: 'connected',
    kind: 'twinkly',
    name: 'Twinkly',
    visual: './assets/images/razer-logo.svg',
  },
  {
    __type: 'device',
    group: 'connected',
    kind: 'goove',
    name: 'Govee',
    visual: './assets/images/razer-logo.svg',
  },
  {
    __type: 'device',
    group: 'connected',
    kind: 'nanoleaf',
    name: 'Nanoleaf',
    visual: './assets/images/razer-logo.svg',
  },
];

const meta: Meta<NavbarComponent> = {
  component: NavbarComponent,
  title: 'Components / Top bar',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    onDeviceActivated: {
      action: (device: Device) => `Activate device ${device.name}`,
      table: {
        disable: true,
      },
    },
  },
};

export default meta;
type Story = StoryObj<NavbarComponent>;

export const InitialState: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          ' default state if no usb devices found or no connected devices found ',
      },
    },
  },
};

export const WithUsbDevicesLoaded: Story = {
  args: {
    usb: usbDevices,
  },
  parameters: {
    docs: {
      description: {
        story: 'State when usb devices found',
      },
    },
  },
};

export const WithConnectedDevicesLoaded: Story = {
  args: {
    connected: connectedDevices,
  },
  parameters: {
    docs: {
      description: {
        story: 'State when connected devices found',
      },
    },
  },
};

export const FullyLoaded: Story = {
  args: {
    usb: usbDevices,
    connected: connectedDevices,
  },
  parameters: {
    docs: {
      description: {
        story: 'Fully loaded state',
      },
    },
  },
};
