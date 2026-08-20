import type { Meta, StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { EffectsPanel } from './effects-panel';

const meta: Meta<EffectsPanel> = {
	// No .mdx beside this one, so Storybook generates the docs page.
	tags: ['autodocs'],
	component: EffectsPanel,
	title: 'Synapse application / Components / effects panel',
};

export default meta;
type Story = StoryObj<EffectsPanel>;

export const Default: Story = {
	name: 'Effects Panel',
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		// Uppercased by the stylesheet, so the accessible name stays "Effects" —
		// a screen reader should not spell it out letter by letter.
		await expect(
			canvas.getByRole('heading', { name: 'Effects' }),
		).toBeVisible();

		const control = canvas.getByRole('combobox', { name: 'Lighting effect' });
		await expect(control).toHaveValue('spectrum');

		// Only the effects worth offering. `none` is left out although the
		// backend implements it: it puts the lighting out, which the brightness
		// switch already does — and does better, since it can bring the effect
		// back afterwards.
		await expect(
			canvas.getAllByRole('option').map((option) => option.textContent?.trim()),
		).toEqual(['Static', 'Spectrum', 'Wave', 'Breathe']);
	},
};

export const Static: Story = {
	name: 'A single colour',
	args: { effect: 'static' },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByLabelText('Colour')).toHaveValue('#00ff00');
	},
};

/**
 * Arrows rather than words, in a radio group so the arrow keys and the single
 * tab stop come from the browser.
 *
 * ⚠️ OpenRazer's `setWave` documents its two directions as horizontal — `1`
 * left-to-right, `2` right-to-left. These point up and down.
 */
export const Wave: Story = {
	name: 'A direction, on a mouse',
	args: { effect: 'wave', waveOrientation: 'vertical' },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('radiogroup', { name: 'Wave direction' }),
		).toBeVisible();
		// Icon-only, so the name has to come from the radio itself.
		await expect(canvas.getByRole('radio', { name: 'Upwards' })).toBeChecked();
	},
};

/**
 * The same two values, read as the device reads them. OpenRazer sends one int
 * and its three drivers document it three ways: up/down on a mouse,
 * left/right on a keyboard, anticlockwise/clockwise on an accessory.
 */
export const WaveOnAKeyboard: Story = {
	name: 'A direction, on a keyboard',
	args: { effect: 'wave', waveOrientation: 'horizontal' },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('radio', { name: 'Leftwards' }),
		).toBeChecked();
	},
};

export const WaveOnAMousemat: Story = {
	name: 'A direction, on a mousemat',
	args: { effect: 'wave', waveOrientation: 'rotary' },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('radio', { name: 'Anticlockwise' }),
		).toBeChecked();
	},
};

/**
 * Two colours and a switch, on one line. The second starts empty — that is
 * `setBreathSingle`; filling it is `setBreathDual`.
 */
export const Breathe: Story = {
	name: 'Two colours',
	args: { effect: 'breathe' },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByLabelText('First colour')).toHaveValue('#00ff00');
		await expect(canvas.getByLabelText('Second colour')).toBeVisible();
		await expect(
			canvas.getByRole('checkbox', { name: 'Random' }),
		).not.toBeChecked();
	},
};

/** `setBreathRandom` — the device picks, so there is nothing left to choose. */
export const BreatheRandom: Story = {
	name: 'A new colour each breath',
	args: {
		effect: 'breathe',
		settings: {
			color: '#00ff00',
			direction: 'forward',
			breathe: { first: '#00ff00', second: '#0000ff', random: true },
		},
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('checkbox', { name: 'Random' }),
		).toBeChecked();
		await expect(canvas.getByLabelText('First colour')).toBeDisabled();
		await expect(canvas.getByLabelText('Second colour')).toBeDisabled();
	},
};
