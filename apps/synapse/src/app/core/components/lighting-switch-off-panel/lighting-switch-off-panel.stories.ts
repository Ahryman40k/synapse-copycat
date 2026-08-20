import type { Meta, StoryObj } from '@storybook/angular';
import { LightingSwitchOffPanelComponent } from './lighting-switch-off-panel';

const meta: Meta<LightingSwitchOffPanelComponent> = {
	// No .mdx beside this one, so Storybook generates the docs page.
	tags: ['autodocs'],
	component: LightingSwitchOffPanelComponent,
	title: 'Synapse application / Components / lighting switch-off panel',
};

export default meta;
type Story = StoryObj<LightingSwitchOffPanelComponent>;

export const Default: Story = {
	name: 'Default Panel',
};
