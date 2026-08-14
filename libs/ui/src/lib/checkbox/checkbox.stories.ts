import { Component, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { componentWrapperDecorator, moduleMetadata } from '@storybook/angular';
import { within } from '@testing-library/angular';
import { expect } from 'storybook/test';
import { CheckboxComponent } from './checkbox';

const meta: Meta<CheckboxComponent> = {
	component: CheckboxComponent,
	title: 'UI library / Checkbox',
	args: { checked: false, disabled: false, indeterminate: false },
	decorators: [
		componentWrapperDecorator(
			(story) =>
				`<div style="display:flex; flex-direction:column; gap:0.75rem; padding:1rem">${story}</div>`,
		),
	],
};

export default meta;
type Story = StoryObj<CheckboxComponent>;

export const Default: Story = {
	name: 'Default',
	render: (args) => ({
		props: args,
		template:
			'<syn-checkbox [checked]="checked" [disabled]="disabled" [indeterminate]="indeterminate">When display is turned off</syn-checkbox>',
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const box = canvas.getByRole('checkbox', {
			name: 'When display is turned off',
		});

		// The projected text labels the control — no aria-label needed.
		await expect(box).not.toBeChecked();
		await expect(box).toBeEnabled();
	},
};

export const Checked: Story = {
	name: 'Checked',
	args: { checked: true },
	render: (args) => ({
		props: args,
		template: '<syn-checkbox [checked]="checked">Enabled</syn-checkbox>',
	}),
};

/** Partial selection — a "select all" over a mixed set. Wins over checked. */
export const Indeterminate: Story = {
	name: 'Indeterminate',
	args: { indeterminate: true },
	render: (args) => ({
		props: args,
		template:
			'<syn-checkbox [indeterminate]="indeterminate">All devices</syn-checkbox>',
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const box = canvas.getByRole('checkbox') as HTMLInputElement;

		await expect(box.indeterminate).toBe(true);
	},
};

/**
 * The real case: a capability the device does not support — the Rust backend
 * answers `InterfaceUnsupported`.
 */
export const Disabled: Story = {
	name: 'Disabled',
	render: () => ({
		template: `
			<syn-checkbox disabled>Unsupported</syn-checkbox>
			<syn-checkbox disabled [checked]="true">Unsupported, on</syn-checkbox>
		`,
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		for (const box of canvas.getAllByRole('checkbox')) {
			await expect(box).toBeDisabled();
		}
	},
};

/** No projected text: `ariaLabel` becomes mandatory. */
export const WithoutLabel: Story = {
	name: 'Without a visible label',
	render: () => ({
		template: '<syn-checkbox ariaLabel="Enable lighting" />',
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('checkbox', { name: 'Enable lighting' }),
		).toBeVisible();
	},
};

// ── keyboard ────────────────────────────────────────────────────────────────

@Component({
	selector: 'syn-checkbox-story-host',
	imports: [CheckboxComponent],
	template: `
		<syn-checkbox [(checked)]="enabled">When display is turned off</syn-checkbox>
		<p style="margin-top:1rem; font:12px/1 sans-serif; opacity:0.7">
			bound value: {{ enabled() }}
		</p>
	`,
})
export class CheckboxStoryHost {
	readonly enabled = signal(false);
}

/**
 * The point of rebuilding this component: the control is reachable with Tab and
 * toggled with Space, because it is a real input rather than a hidden one with
 * a click handler on the host.
 */
export const Keyboard: Story = {
	name: 'Keyboard and two-way binding',
	decorators: [moduleMetadata({ imports: [CheckboxStoryHost] })],
	render: () => ({ template: '<syn-checkbox-story-host />' }),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const box = canvas.getByRole('checkbox');

		box.focus();
		await expect(box).toHaveFocus();

		box.click();
		await expect(box).toBeChecked();
		await expect(canvas.getByText(/bound value: true/)).toBeVisible();
	},
};
