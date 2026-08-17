import type { Meta, StoryObj } from '@storybook/angular';
import { componentWrapperDecorator } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { Battery } from './battery';

const meta: Meta<Battery> = {
	component: Battery,
	title: 'UI library / Battery',
	args: { level: 62, charging: false },
	decorators: [
		componentWrapperDecorator(
			(story) => `<div style="padding:1.5rem">${story}</div>`,
		),
	],
};

export default meta;
type Story = StoryObj<Battery>;

export const Default: Story = {
	name: 'Battery',
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByRole('img')).toHaveAccessibleName(
			'Battery 62%, discharging',
		);
	},
};

export const Charging: Story = { args: { level: 45, charging: true } };

/** Under 20% and nothing being done about it. */
export const Low: Story = { args: { level: 12 } };

/** Charging is its own state, and a good one — never an alarm. */
export const ChargingFromEmpty: Story = {
	name: 'Charging from empty',
	args: { level: 4, charging: true },
};

export const Range: Story = {
	name: 'Across the range',
	render: () => ({
		template: `
			<div style="display:flex; flex-direction:column; gap:0.75rem; align-items:flex-start">
				<syn-battery [level]="0"></syn-battery>
				<syn-battery [level]="12"></syn-battery>
				<syn-battery [level]="50"></syn-battery>
				<syn-battery [level]="100"></syn-battery>
				<syn-battery [level]="80" charging></syn-battery>
			</div>
		`,
	}),
};
