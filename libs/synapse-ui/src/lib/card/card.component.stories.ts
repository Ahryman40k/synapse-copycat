import { Meta, StoryObj } from '@storybook/angular';
import {CardComponent} from './card.component'

const meta: Meta<CardComponent> = {
  title: 'Synapse UI / Card',
 component: CardComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<CardComponent>;

export const Default: Story = {
  render: ({...args}) => ({
    props: args,
    template: `
      <synapse-card>My card content</synapse-card>
`
  })
};


