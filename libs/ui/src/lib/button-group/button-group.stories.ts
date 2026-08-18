import { Component, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { componentWrapperDecorator, moduleMetadata } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { ButtonGroup, type ButtonGroupOption } from './button-group';

const RATES: ButtonGroupOption[] = [
	{ value: '125', label: '125 Hz' },
	{ value: '500', label: '500 Hz' },
	{ value: '1000', label: '1000 Hz' },
];

const meta: Meta<ButtonGroup> = {
	component: ButtonGroup,
	title: 'UI library / Button group',
	args: { options: RATES, value: '1000', ariaLabel: 'Polling rate' },
	decorators: [
		componentWrapperDecorator(
			(story) => `<div style="padding:1.5rem">${story}</div>`,
		),
	],
};

export default meta;
type Story = StoryObj<ButtonGroup>;

export const Default: Story = {
	name: 'Button group',
	render: (args) => ({
		props: args,
		template:
			'<syn-button-group [options]="options" [value]="value" [ariaLabel]="ariaLabel" />',
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('radiogroup', { name: 'Polling rate' }),
		).toBeVisible();
		await expect(canvas.getByRole('radio', { name: '1000 Hz' })).toBeChecked();
	},
};

/** Nothing taken yet — the frame still groups the choices. */
export const Unset: Story = {
	name: 'Nothing chosen',
	args: { value: undefined },
};

/** One entry the device cannot do, and a group that is off entirely. */
export const Disabled: Story = {
	render: (args) => ({
		props: {
			...args,
			partly: [...RATES, { value: '8000', label: '8000 Hz', disabled: true }],
		},
		template: `
			<div style="display:flex; flex-direction:column; gap:1rem; align-items:flex-start">
				<syn-button-group [options]="partly" value="1000" ariaLabel="Partly" />
				<syn-button-group [options]="options" value="500" disabled ariaLabel="Off" />
			</div>
		`,
	}),
};

// ── keyboard and two-way binding ────────────────────────────────────────────

@Component({
	selector: 'syn-button-group-story-host',
	imports: [ButtonGroup],
	template: `
		<syn-button-group
			[options]="rates"
			[(value)]="rate"
			ariaLabel="Polling rate"
		/>
		<p style="margin-top:1rem; font:12px/1 sans-serif; opacity:0.7">
			bound value: {{ rate() }}
		</p>
	`,
})
export class ButtonGroupStoryHost {
	readonly rates = RATES;
	readonly rate = signal('1000');
}

/**
 * Tab lands on the taken choice, and the arrow keys move between the three —
 * both from the native radios, with no code here to exercise them against.
 */
export const Keyboard: Story = {
	name: 'Keyboard and two-way binding',
	decorators: [moduleMetadata({ imports: [ButtonGroupStoryHost] })],
	render: () => ({ template: '<syn-button-group-story-host />' }),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		canvas.getByRole('radio', { name: '125 Hz' }).click();
		await expect(await canvas.findByText(/bound value: 125/)).toBeVisible();
	},
};
