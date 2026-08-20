import { Component, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { componentWrapperDecorator, moduleMetadata } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { ColorPicker } from './color-picker';

const meta: Meta<ColorPicker> = {
	component: ColorPicker,
	title: 'UI library / Color picker',
	args: {
		value: '#48c242',
		disabled: false,
		clearable: false,
	},
	decorators: [
		componentWrapperDecorator(
			(story) =>
				`<div style="display:flex; flex-direction:column; gap:1rem; padding:1rem; max-width:20rem">${story}</div>`,
		),
	],
};

export default meta;
type Story = StoryObj<ColorPicker>;

export const Default: Story = {
	render: (args) => ({
		props: args,
		template: `
			<syn-color-picker [value]="value" [disabled]="disabled" [clearable]="clearable">
				Static colour
			</syn-color-picker>
		`,
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		// A real colour input: the platform picker, the eyedropper and the
		// keyboard all come from the element being native.
		const control = canvas.getByLabelText('Static colour') as HTMLInputElement;
		await expect(control.type).toBe('color');
		await expect(control).toHaveValue('#48c242');
	},
};

/**
 * `undefined` is *no colour chosen* — what the second breathing colour starts
 * as. The native input cannot hold it: it always reports a value, black by
 * default, so the chequerboard behind the swatch is what says "nothing here".
 */
export const Empty: Story = {
	name: 'No colour chosen',
	args: { value: undefined },
	render: (args) => ({
		props: args,
		template:
			'<syn-color-picker [value]="value">Second colour</syn-color-picker>',
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByText('None')).toBeVisible();
	},
};

/** The way back to empty, which the native picker has no entry for. */
export const Clearable: Story = {
	args: { clearable: true },
	render: (args) => ({
		props: args,
		template: `
			<syn-color-picker [value]="value" [clearable]="clearable">
				Second colour
			</syn-color-picker>
		`,
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByRole('button', { name: 'Clear' })).toBeVisible();
	},
};

/** Whole control off — a capability the device does not report. */
export const Disabled: Story = {
	args: { disabled: true },
	render: (args) => ({
		props: args,
		template: `
			<syn-color-picker [value]="value" [disabled]="disabled">
				Unsupported
			</syn-color-picker>
		`,
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByLabelText('Unsupported')).toBeDisabled();
	},
};

// ── two-way binding ─────────────────────────────────────────────────────────

@Component({
	selector: 'syn-color-picker-story-host',
	imports: [ColorPicker],
	template: `
		<syn-color-picker [(value)]="colour" clearable>Colour</syn-color-picker>
		<p style="margin-top:1rem; font:12px/1 sans-serif; opacity:0.7">
			bound value: {{ colour() ?? 'none' }}
		</p>
	`,
})
export class ColorPickerStoryHost {
	readonly colour = signal<string | undefined>('#48c242');
}

/** A pick reaches the model, and Clear takes it back to nothing. */
export const TwoWay: Story = {
	name: 'Two-way binding',
	decorators: [moduleMetadata({ imports: [ColorPickerStoryHost] })],
	render: () => ({ template: '<syn-color-picker-story-host />' }),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const control = canvas.getByLabelText('Colour') as HTMLInputElement;

		control.value = '#ff0000';
		control.dispatchEvent(new Event('input'));
		await expect(await canvas.findByText(/bound value: #ff0000/)).toBeVisible();

		canvas.getByRole('button', { name: 'Clear' }).click();
		await expect(await canvas.findByText(/bound value: none/)).toBeVisible();
	},
};
