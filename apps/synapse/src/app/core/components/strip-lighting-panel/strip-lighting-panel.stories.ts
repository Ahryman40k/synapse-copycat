import type { Meta, StoryObj } from '@storybook/angular';
import { StripLightingPanel } from './strip-lighting-panel';

const meta: Meta<StripLightingPanel> = {
	// No .mdx beside this one, so Storybook generates the docs page.
	tags: ['autodocs'],
	component: StripLightingPanel,
	title: 'Synapse application / Components / strip lighting panel',
};

export default meta;
type Story = StoryObj<StripLightingPanel>;

export const Lit: Story = {
	args: { lighting: { on: true, color: '#ff2d95' } },
};

/** The colour stays choosable — see the comment in the template. */
export const Dark: Story = {
	args: { lighting: { on: false, color: '#ff2d95' } },
};
