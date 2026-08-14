import { Component, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { componentWrapperDecorator, moduleMetadata } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { Select, type SelectOption } from './select';

const EFFECTS: SelectOption[] = [
	{ value: 'none', label: 'None' },
	{ value: 'static', label: 'Static' },
	{ value: 'spectrum', label: 'Spectrum' },
	{ value: 'wave', label: 'Wave' },
	{ value: 'breathe', label: 'Breathe' },
];

const meta: Meta<Select> = {
	component: Select,
	title: 'UI library / Select',
	args: {
		options: EFFECTS,
		value: 'spectrum',
		disabled: false,
	},
	decorators: [
		componentWrapperDecorator(
			(story) =>
				`<div style="display:flex; flex-direction:column; gap:0.75rem; padding:1rem; max-width:20rem">${story}</div>`,
		),
	],
};

export default meta;
type Story = StoryObj<Select>;

export const Default: Story = {
	render: (args) => ({
		props: args,
		template: `
			<syn-select [options]="options" [value]="value" [disabled]="disabled">
				Effect
			</syn-select>
		`,
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		// A real <select>: the role comes from the element, not from an aria-role
		// bolted onto a div.
		const control = canvas.getByRole('combobox', { name: 'Effect' });
		await expect(control).toHaveValue('spectrum');
		await expect(canvas.getAllByRole('option')).toHaveLength(5);
	},
};

/**
 * A value set by the parent must show on first paint. It did not, at first:
 * binding `[value]` on the `<select>` applies the property before `@for` has
 * rendered any `<option>`, so it lands on an empty list and the browser drops
 * it. Each option carries its own `[selected]` instead.
 */
export const PreselectedValue: Story = {
	name: 'Value set from outside',
	args: { value: 'wave' },
	render: (args) => ({
		props: args,
		template:
			'<syn-select [options]="options" [value]="value">Effect</syn-select>',
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByRole('combobox')).toHaveValue('wave');
	},
};

/** Whole control off, and one entry off inside an otherwise usable list. */
export const Disabled: Story = {
	render: () => ({
		props: {
			effects: EFFECTS,
			partly: [
				...EFFECTS.slice(0, 3),
				{
					value: 'reactive',
					label: 'Reactive (no capability)',
					disabled: true,
				},
			] satisfies SelectOption[],
		},
		template: `
			<syn-select disabled [options]="effects" value="static">Unsupported</syn-select>
			<syn-select [options]="partly" value="static">Effect</syn-select>
		`,
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		const [unsupported, effect] = canvas.getAllByRole('combobox');
		await expect(unsupported).toBeDisabled();
		await expect(effect).toBeEnabled();
		await expect(
			canvas.getByRole('option', { name: 'Reactive (no capability)' }),
		).toBeDisabled();
	},
};

/** No projected text, so `ariaLabel` becomes mandatory. */
export const WithoutLabel: Story = {
	name: 'Without a visible label',
	render: (args) => ({
		props: args,
		template:
			'<syn-select ariaLabel="Lighting effect" [options]="options" value="none" />',
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('combobox', { name: 'Lighting effect' }),
		).toBeVisible();
	},
};

// ── keyboard and two-way binding ────────────────────────────────────────────

@Component({
	selector: 'syn-select-story-host',
	imports: [Select],
	template: `
		<syn-select [options]="effects" [(value)]="effect">Effect</syn-select>
		<p style="margin-top:1rem; font:12px/1 sans-serif; opacity:0.7">
			bound value: {{ effect() }}
		</p>
	`,
})
export class SelectStoryHost {
	readonly effects = EFFECTS;
	readonly effect = signal('spectrum');
}

/**
 * Tab reaches it, and a choice reaches the model. Type-ahead, Home/End and the
 * arrow keys come free with the native element — there is no code here to
 * exercise them against.
 */
export const Keyboard: Story = {
	name: 'Keyboard and two-way binding',
	decorators: [moduleMetadata({ imports: [SelectStoryHost] })],
	render: () => ({ template: '<syn-select-story-host />' }),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const control = canvas.getByRole('combobox') as HTMLSelectElement;

		control.focus();
		await expect(control).toHaveFocus();

		control.value = 'breathe';
		control.dispatchEvent(new Event('change'));

		await expect(canvas.getByText(/bound value: breathe/)).toBeVisible();
	},
};
