import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { CheckboxComponent } from '../checkbox/checkbox';
import { SliderComponent } from '../slider/slider';
import { SwitchComponent } from '../switch/switch';
import { Panel } from './panel';

const meta: Meta<Panel> = {
	component: Panel,
	title: 'UI library / Panel',
	decorators: [
		moduleMetadata({
			imports: [SwitchComponent, SliderComponent, CheckboxComponent],
		}),
	],
};

export default meta;
type Story = StoryObj<Panel>;

/**
 * A group of controls on a raised surface. Static on purpose — the controls
 * inside are what react.
 */
export const Default: Story = {
	name: 'Default',
	render: () => ({
		template: `
			<syn-panel>
				<syn-switch [checked]="true">Brightness</syn-switch>
				<syn-slider [value]="60" ariaLabel="Brightness"></syn-slider>
			</syn-panel>
		`,
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('switch', { name: 'Brightness' }),
		).toBeVisible();
		// The container announces nothing of its own.
		await expect(canvasElement.querySelector('syn-panel')).not.toHaveAttribute(
			'role',
		);
	},
};

/** Whatever fits: a heading and a checkbox, as the lighting panel uses it. */
export const WithHeading: Story = {
	name: 'With a heading',
	render: () => ({
		template: `
			<syn-panel>
				<h2 style="margin:0; font-size:1rem">Switch off lighting</h2>
				<syn-checkbox>When display is turned off</syn-checkbox>
			</syn-panel>
		`,
	}),
};

/** Several side by side, which is how a device page lays them out. */
export const Several: Story = {
	name: 'Several',
	render: () => ({
		template: `
			<div style="display:flex; gap:1rem; flex-wrap:wrap">
				<syn-panel>
					<syn-switch [checked]="true">Brightness</syn-switch>
					<syn-slider [value]="60" ariaLabel="Brightness"></syn-slider>
				</syn-panel>
				<syn-panel>
					<syn-checkbox>When display is turned off</syn-checkbox>
					<syn-checkbox [checked]="true">When idle</syn-checkbox>
				</syn-panel>
			</div>
		`,
	}),
};
