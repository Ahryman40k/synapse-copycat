import { Component, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { componentWrapperDecorator, moduleMetadata } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { TemperatureSlider } from './temperature-slider';

const meta: Meta<TemperatureSlider> = {
	component: TemperatureSlider,
	title: 'UI library / Temperature slider',
	args: { ariaLabel: 'White balance', value: 5000, disabled: false },
	decorators: [
		componentWrapperDecorator(
			(story) => `<div style="padding:1.5rem; max-width:24rem">${story}</div>`,
		),
	],
};

export default meta;
type Story = StoryObj<TemperatureSlider>;

/**
 * The track is the scale itself: a ramp from blue to orange, shown end to end
 * rather than filled from the left. Temperature is not a quantity you have
 * more or less of — every point on it is a colour.
 */
export const Default: Story = {
	name: 'White balance',
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		const field = canvas.getByRole('slider', { name: 'White balance' });
		await expect(field).toHaveAttribute('min', '2000');
		await expect(field).toHaveAttribute('max', '7500');
		await expect(canvas.getByText('cool')).toBeVisible();
		await expect(canvas.getByText('warm')).toBeVisible();
	},
};

export const Warm: Story = { args: { value: 2800 } };
export const Cool: Story = { args: { value: 7000 } };

/** Off, because the camera is choosing the value itself. */
export const Disabled: Story = { args: { disabled: true } };

@Component({
	selector: 'syn-temperature-story-host',
	imports: [TemperatureSlider],
	template: `
		<syn-temperature-slider ariaLabel="White balance" [(value)]="kelvin" />
		<p style="margin-top:1rem; font:12px/1 sans-serif; opacity:0.7">
			bound value: {{ kelvin() }} K
		</p>
	`,
})
export class TemperatureStoryHost {
	readonly kelvin = signal(5000);
}

export const TwoWay: Story = {
	name: 'Two-way binding',
	decorators: [moduleMetadata({ imports: [TemperatureStoryHost] })],
	render: () => ({ template: '<syn-temperature-story-host />' }),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const field = canvas.getByRole('slider') as HTMLInputElement;

		field.value = '6200';
		field.dispatchEvent(new Event('input'));

		await expect(canvas.getByText(/bound value: 6200 K/)).toBeVisible();
	},
};
