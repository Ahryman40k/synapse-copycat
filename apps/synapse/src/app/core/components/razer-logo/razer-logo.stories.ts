import type { Meta, StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { RazerLogo } from './razer-logo';

const meta: Meta<RazerLogo> = {
	component: RazerLogo,
	title: 'Synapse application / Components / Razer logo',
};

export default meta;
type Story = StoryObj<RazerLogo>;

/**
 * Pick a device colour in the toolbar: the disc follows it, and the snake
 * flips between its dark and light form to stay readable on top.
 */
export const Default: Story = {
	name: 'Razer logo',
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByRole('img', { name: 'Razer' })).toBeVisible();
	},
};

/** It takes its size from the text around it, like any other mark. */
export const Sizes: Story = {
	render: () => ({
		template: `
			<div style="display:flex; align-items:center; gap:1rem">
				<razer-logo style="font-size:1em"></razer-logo>
				<razer-logo style="font-size:2em"></razer-logo>
				<razer-logo style="font-size:4em"></razer-logo>
			</div>
		`,
	}),
};
