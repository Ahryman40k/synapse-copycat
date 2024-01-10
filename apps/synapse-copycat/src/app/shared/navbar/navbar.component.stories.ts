import { Meta, StoryObj } from '@storybook/angular';
import { Device, UsbDeviceSchema } from '../../models';

import { NavbarComponent } from './navbar.component';

import UsbDeviceRepository from '../../../assets/usb-devices.json';

import { z } from 'zod';

export const UsbDeviceRepositorySchema = z.object({
  name: z.string(),
  visual: z.string(),
  kind: UsbDeviceSchema,
  id: z.string(),
});

const DeviceRepository = z.record(z.record(UsbDeviceRepositorySchema));
type DeviceRepository = z.infer<typeof DeviceRepository>;

const t = {
  '123': {
    a: {
      a1: 1,
      a2: 2,
    },
  },
  '456': {
    b: {
      b1: 2,
      b2: 3,
    },
  },
};


type T1A = keyof (typeof t)['123']['a'];
type T1B = keyof (typeof t)['456']['b'];

const t2 = UsbDeviceRepository

type T2A = keyof (typeof t2)['5426']['134'];
type T2B = keyof (typeof t2)['5426']['136'];

type ExtractGroupKeys<T> = keyof T;
type ExtractIdKeys<
  T extends Record<string, any>,
  G extends string
> = keyof T[G];

type T1 = ExtractGroupKeys<typeof t>;
type T2 = ExtractIdKeys<typeof t, ExtractGroupKeys<typeof t>>;

const extractUsbDevice = <
  T extends Record<string, any>,
  G extends string & ExtractGroupKeys<T>,
  D extends ExtractIdKeys<T, G>
>(
  devices: T,
  deviceGroup: keyof T,
  deviceId: D
): Device => {
  const groupExists = !!devices[deviceGroup];
  if (!groupExists)
    throw new Error(`Unkown device group ${String(deviceGroup)}`);

  const deviceIdExists = groupExists && !!devices[deviceGroup][deviceId];
  if (deviceIdExists)
    throw new Error(
      `Unknown device id ${String(deviceId)} in device group ${String(
        deviceGroup
      )}`
    );

  const device = devices[deviceGroup][deviceId];
  return {
    __type: 'device',
    group: 'usb',

    id: deviceId,

    name: device.name,
    kind: device.kind,
    visual: device.visual,
  } as Device;
};

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
    kind: 'camera',
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
