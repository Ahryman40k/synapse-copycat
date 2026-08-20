import type { Meta, StoryObj } from '@storybook/angular';
import { BrightnessPanelComponent } from './brightness-panel';

const meta: Meta<BrightnessPanelComponent> = {
	// No .mdx beside this one, so Storybook generates the docs page.
	tags: ['autodocs'],
	component: BrightnessPanelComponent,
	title: 'Synapse application / Components / brightness panel',
};

export default meta;
type Story = StoryObj<BrightnessPanelComponent>;

export const Default: Story = {
	name: 'Brightness Panel',
};
