import {
  applicationConfig,
  type Meta,
  type StoryObj,
} from '@storybook/angular';
import { DashboardPage } from './dashboard-page';
import {
  ApplicationState,
  ApplicationStore,
} from '../core/stores/application-store';
import { signalStore, withState } from '@ngrx/signals';

const MockedStore = signalStore(
  withState<ApplicationState>({
    devices: [
      {
        __type: 'device',
        kind: 'mouse',
        name: 'Razer Basilisk Ultimate',
        id: '5426-0136',
        visual: 'assets/devices/5426-0136.png',
      },
      {
        __type: 'device',
        kind: 'accessory',
        name: 'Razer Basilisk Ultimate (dock)',
        id: '5426-0126',
        visual: 'assets/devices/5426-0126.png',
      },
      {
        __type: 'device',
        kind: 'keyboard',
        name: 'Razer Huntsman elite',
        id: '5426-0550',
        visual: 'assets/devices/5426-0550.png',
      },
      {
        __type: 'device',
        kind: 'mousemat',
        name: 'Razer Goliathus',
        id: '5426-3074',
        visual: 'assets/devices/5426-3074.png',
      },
      {
        __type: 'device',
        kind: 'streaming',
        name: 'Razer Kiyo',
        id: '5426-3587',
        visual: 'assets/devices/5426-3587.png',
      },
    ],
    modules: [
      {
        __type: 'module',
        name: 'Twinkly',
        kind: 'twinkly',
        visual: 'assets/modules/twinkly.png',
      },
      {
        __type: 'module',
        name: 'Goove',
        kind: 'goove',
        visual: 'assets/modules/goove.png',
      },
    ],
  })
);

const meta: Meta<DashboardPage> = {
  component: DashboardPage,
  title: 'Synapse Application / Pages / Dashboard',
  decorators: [
    applicationConfig({
      providers: [{ provide: ApplicationStore, useClass: MockedStore }],
    }),
  ],
};
export default meta;

type Story = StoryObj<DashboardPage>;

export const Default: Story = {};
