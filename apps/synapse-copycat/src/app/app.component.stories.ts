import { Meta, moduleMetadata } from '@storybook/angular';
import { AppComponent } from './app.component';
import { provideMockStore } from '@ngrx/store/testing';
import { ActivatedRoute } from '@angular/router';
import { Device } from './models';

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
    visual: './assets/images/razer-logo.svg',
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
export default {
  title: 'AppComponent',
  component: AppComponent,
  decorators: [
    moduleMetadata({
      providers: [
        provideMockStore({
          initialState: {
            usb: usbDevices,
            connected: connectedDevices,
          },
        }),
        {
          provide: ActivatedRoute,
          useValue: {},
        },
      ],
    }),
  ],
} as Meta<AppComponent>;

export const Primary = {
  render: (args: AppComponent) => ({
    props: args,
  }),
  args: {},
};
