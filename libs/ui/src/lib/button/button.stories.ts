import type { Meta, StoryObj } from '@storybook/angular';
import { componentWrapperDecorator } from '@storybook/angular';
import { within } from '@testing-library/angular';
import { expect } from 'storybook/test';
import { Button } from './button';

const meta: Meta<Button> = {
	component: Button,
	title: 'UI library / Button',
	argTypes: {
		variant: {
			control: { type: 'inline-radio' },
			options: ['primary', 'secondary', 'ghost'],
		},
	},
	args: { variant: 'primary' },
	decorators: [
		componentWrapperDecorator(
			(story) =>
				`<div style="display:flex; gap:1rem; align-items:center; padding:1rem">${story}</div>`,
		),
	],
};

export default meta;
type Story = StoryObj<Button>;

/**
 * The label colour is `--syn-on-primary`, derived by measuring contrast against
 * `--syn-primary`. Switch the device colour in the toolbar — on amber the label
 * turns dark on its own, on blue it turns light. Nothing is pinned.
 */
export const Primary: Story = {
	name: 'Primary',
	render: (args) => ({
		props: args,
		template: '<button syn-button [variant]="variant">Apply</button>',
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const button = canvas.getByRole('button', { name: 'Apply' });

		await expect(button).toHaveAttribute('data-variant', 'primary');
		await expect(button).toBeEnabled();
	},
};

/** Outlined: same geometry, border and label take the primary colour. */
export const Secondary: Story = {
	name: 'Secondary',
	args: { variant: 'secondary' },
	render: (args) => ({
		props: args,
		template: '<button syn-button [variant]="variant">Cancel</button>',
	}),
};

/** No fill, no border — for low-emphasis actions inside a dense panel. */
export const Ghost: Story = {
	name: 'Ghost',
	args: { variant: 'ghost' },
	render: (args) => ({
		props: args,
		template: '<button syn-button [variant]="variant">Reset</button>',
	}),
};

/** The three side by side, which is how a variant change is easiest to judge. */
export const AllVariants: Story = {
	name: 'All variants',
	render: () => ({
		template: `
			<button syn-button>Apply</button>
			<button syn-button variant="secondary">Cancel</button>
			<button syn-button variant="ghost">Reset</button>
		`,
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByRole('button', { name: 'Apply' })).toHaveAttribute(
			'data-variant',
			'primary',
		);
		await expect(
			canvas.getByRole('button', { name: 'Cancel' }),
		).toHaveAttribute('data-variant', 'secondary');
		await expect(canvas.getByRole('button', { name: 'Reset' })).toHaveAttribute(
			'data-variant',
			'ghost',
		);
	},
};

/**
 * The real case: a capability the device does not support — the Rust backend
 * answers `InterfaceUnsupported`. There is no `disabled` input; the native
 * attribute is the state, which is why the button also stops taking clicks.
 */
export const Disabled: Story = {
	name: 'Disabled',
	render: () => ({
		template: `
			<button syn-button disabled>Apply</button>
			<button syn-button variant="secondary" disabled>Cancel</button>
			<button syn-button variant="ghost" disabled>Reset</button>
		`,
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		for (const name of ['Apply', 'Cancel', 'Reset']) {
			await expect(canvas.getByRole('button', { name })).toBeDisabled();
		}
	},
};

/**
 * An anchor styled as a button. Still a link: it navigates, opens in a new tab
 * on middle-click, and is announced as a link. Use `aria-disabled` rather than
 * `disabled`, which anchors do not have.
 */
export const AsLink: Story = {
	name: 'As a link',
	render: () => ({
		template: `
			<a syn-button href="#docs">Open the docs</a>
			<a syn-button variant="secondary" href="#docs" aria-disabled="true">Unavailable</a>
		`,
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		const link = canvas.getByRole('link', { name: 'Open the docs' });
		await expect(link).toHaveAttribute('href', '#docs');
		await expect(link).toHaveAttribute('data-variant', 'primary');
	},
};

/**
 * The focus ring is not decoration: this is a keyboard control, and the
 * previous implementation had none. Tab to the button to see it.
 */
export const Focus: Story = {
	name: 'Keyboard focus',
	render: () => ({
		template: '<button syn-button>Tab to me</button>',
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const button = canvas.getByRole('button', { name: 'Tab to me' });

		button.focus();
		await expect(button).toHaveFocus();
	},
};
