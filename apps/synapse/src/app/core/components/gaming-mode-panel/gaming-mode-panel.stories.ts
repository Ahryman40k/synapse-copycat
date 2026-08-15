import type { Meta, StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { GamingModePanel } from './gaming-mode-panel';

const meta: Meta<GamingModePanel> = {
	component: GamingModePanel,
	title: 'Synapse application / Components / gaming mode panel',
};

export default meta;
type Story = StoryObj<GamingModePanel>;

export const Default: Story = {
	name: 'Gaming mode panel',
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		// Off, so every option is out of reach until the mode is switched on.
		await expect(
			canvas.getByRole('switch', { name: 'Gaming mode' }),
		).not.toBeChecked();
		for (const input of canvas.getAllByRole('checkbox')) {
			await expect(input).toBeDisabled();
		}
	},
};

export const On: Story = {
	name: 'Switched on',
	args: {
		value: {
			activated: true,
			inGameOnly: true,
			disableWindowsKey: true,
			disableMenuKey: false,
			disableAltTab: true,
			disableAltF4: false,
		},
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('checkbox', { name: 'Disable ALT + Tab' }),
		).toBeChecked();
	},
};
