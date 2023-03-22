import { Meta } from '@storybook/angular';

import { DeviceCardComponent } from './device-card.component';

export default {
  title: 'Components / Cards / Device Card',
  component: DeviceCardComponent,
} as Meta<DeviceCardComponent>;


const Template = () => `
   <synapse-copycat-device-card> 
  </synapse-copycat-device-card>
 `
 
export const Primary = Template.bind({});

