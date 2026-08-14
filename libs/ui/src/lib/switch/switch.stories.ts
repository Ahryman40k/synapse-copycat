import { Component, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { componentWrapperDecorator, moduleMetadata } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { SwitchComponent } from './switch';

const meta: Meta<SwitchComponent> = {
	component: SwitchComponent,
	title: 'UI library / Switch',
	args: {
		checked: false,
		disabled: false,
	},
	decorators: [
		componentWrapperDecorator(
			(story) =>
				`<div style="display:flex; flex-direction:column; gap:0.75rem; padding:1rem">${story}</div>`,
		),
	],
};

export default meta;
type Story = StoryObj<SwitchComponent>;

export const Default: Story = {
	render: (args) => ({
		props: args,
		template:
			'<syn-switch [checked]="checked" [disabled]="disabled">Brightness</syn-switch>',
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		// Announced as a switch — on/off — rather than checked/unchecked.
		const control = canvas.getByRole('switch', { name: 'Brightness' });
		await expect(control).not.toBeChecked();
		await expect(canvas.queryByRole('checkbox')).not.toBeInTheDocument();
	},
};

export const On: Story = {
	args: { checked: true },
	render: (args) => ({
		props: args,
		template: '<syn-switch [checked]="checked">Brightness</syn-switch>',
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByRole('switch')).toBeChecked();
	},
};

/**
 * The real case: a capability the device does not support — the Rust backend
 * answers `InterfaceUnsupported`.
 */
export const Disabled: Story = {
	render: () => ({
		template: `
			<syn-switch disabled>Unsupported</syn-switch>
			<syn-switch disabled [checked]="true">Unsupported, on</syn-switch>
		`,
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		for (const control of canvas.getAllByRole('switch')) {
			await expect(control).toBeDisabled();
		}
	},
};

/** No projected text: `ariaLabel` becomes mandatory. */
export const WithoutLabel: Story = {
	name: 'Without a visible label',
	render: () => ({
		template: '<syn-switch ariaLabel="Enable lighting" />',
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('switch', { name: 'Enable lighting' }),
		).toBeVisible();
	},
};

// ── keyboard ────────────────────────────────────────────────────────────────

@Component({
	selector: 'syn-switch-story-host',
	imports: [SwitchComponent],
	template: `
		<syn-switch [(checked)]="brightness">Brightness</syn-switch>
		<p style="margin-top:1rem; font:12px/1 sans-serif; opacity:0.7">
			bound value: {{ brightness() }}
		</p>
	`,
})
export class SwitchStoryHost {
	readonly brightness = signal(false);
}

/**
 * Reachable with Tab, toggled with Space — and exactly once per activation.
 * The previous `label[syn-switch]` form made the native label and a host click
 * handler both fire, so the two cancelled out.
 */
export const Keyboard: Story = {
	name: 'Keyboard and two-way binding',
	decorators: [moduleMetadata({ imports: [SwitchStoryHost] })],
	render: () => ({ template: '<syn-switch-story-host />' }),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const control = canvas.getByRole('switch');

		control.focus();
		await expect(control).toHaveFocus();

		control.click();
		await expect(control).toBeChecked();
		await expect(canvas.getByText(/bound value: true/)).toBeVisible();

		control.click();
		await expect(control).not.toBeChecked();
	},
};
