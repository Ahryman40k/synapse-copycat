import type { Meta, StoryObj } from '@storybook/angular';
import { componentWrapperDecorator } from '@storybook/angular';
import { expect, fn, within } from 'storybook/test';
import { Card } from './card';

const meta: Meta<Card> = {
	component: Card,
	title: 'UI library / Card',
	args: { image: 'assets/devices/5426-0136.png', imageAlt: '' },
	decorators: [
		componentWrapperDecorator(
			(story) =>
				`<div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(min(16rem,100%),1fr)); gap:1rem; padding:1rem; max-width:56rem">${story}</div>`,
		),
	],
};

export default meta;
type Story = StoryObj<Card>;

/**
 * A device on the dashboard. The whole surface activates, so it is a real
 * `<button>` — hover lifts it, Tab reaches it, Enter and Space open it.
 */
export const Default: Story = {
	name: 'Device card',
	render: (args) => ({
		props: { ...args, open: fn() },
		template: `
			<button syn-card type="button" [image]="image" (click)="open()">
				Razer Basilisk Ultimate
			</button>
		`,
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const card = canvas.getByRole('button', {
			name: /Razer Basilisk Ultimate/,
		});

		await expect(card).toBeEnabled();
		card.focus();
		await expect(card).toHaveFocus();
	},
};

/**
 * The real assets, whose aspect ratios are nothing alike. Every card still lays
 * out identically: the media box is the card's width by `8em`, and
 * `object-fit: contain` letterboxes inside it.
 *
 * The picture goes through the `image` input rather than being projected — a
 * component's encapsulated styles cannot reach projected content, so a
 * projected `<img>` kept its intrinsic size and burst out of the card. The
 * 2868×1292 mousemat is the one that made it obvious.
 */
export const AspectRatios: Story = {
	name: 'Mixed aspect ratios',
	render: () => ({
		props: { open: fn() },
		template: `
			<button syn-card type="button" image="assets/devices/5426-0136.png" (click)="open()">
				Basilisk · 205×327 · ratio 0.63
			</button>
			<button syn-card type="button" image="assets/devices/5426-3074.png" (click)="open()">
				Goliathus · 2868×1292 · ratio 2.22
			</button>
			<button syn-card type="button" image="assets/devices/5426-3587.png" (click)="open()">
				Kiyo · 500×500 · ratio 1.00
			</button>
		`,
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		// None of them overflows its grid track, whatever the source ratio.
		for (const card of canvas.getAllByRole('button')) {
			const track = card.parentElement as HTMLElement;
			await expect(card.getBoundingClientRect().width).toBeLessThanOrEqual(
				track.getBoundingClientRect().width + 0.5,
			);
		}
	},
};

/** What the dashboard renders: one card per connected device. */
export const Grid: Story = {
	name: 'A grid of devices',
	render: () => ({
		props: { open: fn() },
		template: `
			<button syn-card type="button" image="assets/devices/5426-0136.png" (click)="open()">
				Razer Basilisk Ultimate
			</button>
			<button syn-card type="button" image="assets/devices/5426-3074.png" (click)="open()">
				Razer Goliathus
			</button>
			<button syn-card type="button" image="assets/devices/5426-0550.png" (click)="open()">
				Razer Huntsman Elite
			</button>
			<button syn-card type="button" image="assets/devices/5426-3587.png" (click)="open()">
				Razer Kiyo
			</button>
		`,
	}),
};

/**
 * Navigating rather than acting: still a link, so middle-click and "open in a
 * new tab" keep working.
 */
export const AsLink: Story = {
	name: 'As a link',
	render: () => ({
		template: `
			<a syn-card href="#device" image="assets/devices/5426-3074.png">
				Razer Goliathus
			</a>
		`,
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('link', { name: /Razer Goliathus/ }),
		).toHaveAttribute('href', '#device');
	},
};

/** A device present but unusable — no lift, no pointer, no activation. */
export const Disabled: Story = {
	render: () => ({
		template: `
			<button syn-card type="button" image="assets/devices/5426-3587.png" disabled>
				Razer Kiyo
			</button>
		`,
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('button', { name: /Razer Kiyo/ }),
		).toBeDisabled();
	},
};
