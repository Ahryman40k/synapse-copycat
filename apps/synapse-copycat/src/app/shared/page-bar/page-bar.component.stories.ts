import { Meta, Story } from '@storybook/angular';

import { PageBarComponent } from './page-bar.component';

export default {
  title: 'Components / Page bar',
  component: PageBarComponent,
} as Meta<PageBarComponent>;

const Template = () => `
   <synapse-copycat-page-bar> 
  </synapse-copycat-page-bar>
 `;

export const Primary = Template.bind({});
