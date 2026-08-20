import type { Meta, StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { DeviceStage } from './device-stage';

/**
 * Stands in for the real artwork, inline so the story pulls no asset of its
 * own and stays readable whatever the theme colour is.
 */
const MOUSEMAT = `data:image/svg+xml;utf8,${encodeURIComponent(
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120">
		<rect x="8" y="8" width="304" height="104" rx="12"
			fill="#1b1f1b" stroke="#48c242" stroke-width="3"/>
		<rect x="26" y="26" width="268" height="68" rx="6"
			fill="none" stroke="#2f3a2f" stroke-width="2"/>
	</svg>`,
)}`;

const meta: Meta<DeviceStage> = {
	// No .mdx beside this one, so Storybook generates the docs page.
	tags: ['autodocs'],
	component: DeviceStage,
	title: 'Synapse application / Components / device stage',
	args: {
		image: MOUSEMAT,
		name: 'Goliatus Extended',
	},
};

export default meta;
type Story = StoryObj<DeviceStage>;

export const Default: Story = {
	name: 'Device stage',
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('img', { name: 'Goliatus Extended' }),
		).toBeVisible();
	},
};

/**
 * A device no artwork has been drawn for: the picture 404s and the stage falls
 * back to the backdrop alone.
 */
export const WithoutArtwork: Story = {
	name: 'No picture',
	args: { image: undefined },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.queryByRole('img')).not.toBeInTheDocument();
		await expect(
			canvasElement.querySelector('.device-stage__backdrop'),
		).toBeVisible();
	},
};
