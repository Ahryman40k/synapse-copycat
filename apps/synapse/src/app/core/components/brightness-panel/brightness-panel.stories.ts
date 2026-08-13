import type { Meta, StoryObj } from '@storybook/angular';
import { BrightnessPanelComponent } from './brightness-panel';

const meta: Meta<BrightnessPanelComponent> = {
	component: BrightnessPanelComponent,
	title: 'Synapse application / Components / brightness panel',
};

export default meta;
type Story = StoryObj<BrightnessPanelComponent>;

export const Default: Story = {
	name: 'Brightness Panel',
};
