import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { type Ambience, still } from '@synapse-copycat/backend-api';
import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { AmbiencePanel } from './ambience-panel';

const meta: Meta<AmbiencePanel> = {
	// No .mdx beside this one, so Storybook generates the docs page.
	tags: ['autodocs'],
	component: AmbiencePanel,
	title: 'Synapse application / Components / ambience panel',
};

export default meta;
type Story = StoryObj<AmbiencePanel>;

export const Still: Story = {
	name: 'One colour, no movement',
	args: { ambience: still('#00ff00') },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('combobox', { name: 'Colour source' }),
		).toHaveValue('fixed');
		await expect(canvas.getByLabelText('Chosen colour')).toHaveValue('#00ff00');

		// `still` means no movement and one level, so neither of those channels
		// shows anything further. A row of controls that do nothing would say
		// less than an empty row.
		await expect(
			canvas.queryByRole('slider', { name: 'Wave speed' }),
		).not.toBeInTheDocument();
	},
};

const composed: Ambience = {
	colour: { type: 'rainbow', turnsPerSecond: 0.2, spread: 1 },
	motion: { type: 'wave', lapsPerSecond: 0.5, width: 0.2 },
	brightness: { type: 'circadian', day: 1, night: 0.2 },
};

/**
 * The whole point of the model: three sources chosen independently, all
 * showing at once. Nothing here has to win over anything else.
 */
export const Composed: Story = {
	name: 'Three sources at once',
	args: { ambience: composed },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('combobox', { name: 'Colour source' }),
		).toHaveValue('rainbow');
		await expect(
			canvas.getByRole('combobox', { name: 'Motion source' }),
		).toHaveValue('wave');
		await expect(
			canvas.getByRole('combobox', { name: 'Brightness source' }),
		).toHaveValue('circadian');

		// Each source brought its own settings, and only its own.
		await expect(
			canvas.getByRole('slider', { name: 'Wave speed' }),
		).toBeVisible();
		await expect(
			canvas.getByRole('slider', { name: 'Night level' }),
		).toBeVisible();
		await expect(
			canvas.queryByRole('slider', { name: 'Pulse period' }),
		).not.toBeInTheDocument();
	},
};

export const Pulsing: Story = {
	name: 'A pulse',
	args: {
		ambience: { ...still('#ff3300'), motion: { type: 'pulse', period: 2500 } },
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		// 2500ms shown as 25 tenths: the wire is milliseconds, the slider is not.
		await expect(
			canvas.getByRole('slider', { name: 'Pulse period' }),
		).toHaveValue('25');
	},
};

export const Disabled: Story = {
	name: 'Read only',
	args: { ambience: still('#00ff00'), disabled: true },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('combobox', { name: 'Colour source' }),
		).toBeDisabled();
		await expect(canvas.getByLabelText('Chosen colour')).toBeDisabled();
	},
};

// ── two-way binding ─────────────────────────────────────────────────────────

@Component({
	selector: 'ambience-panel-story-host',
	imports: [AmbiencePanel, JsonPipe],
	template: `
		<ambience-panel [(ambience)]="ambience"></ambience-panel>
		<pre
			style="margin-top:1rem; font:11px/1.4 ui-monospace,monospace; opacity:0.75"
			data-testid="bound"
			>{{ ambience() | json }}</pre
		>
	`,
})
export class AmbiencePanelStoryHost {
	readonly ambience = signal<Ambience>(still('#00ff00'));
}

/**
 * Choosing a source, tuning it, going away and coming back.
 *
 * The last part is the one worth having: the panel remembers what each source
 * was tuned to, so switching to another and back does not reset it. That
 * memory lives in the panel and not in the ambience, which carries only the
 * source that is showing.
 */
export const Binding: Story = {
	name: 'Choosing and remembering',
	decorators: [moduleMetadata({ imports: [AmbiencePanelStoryHost] })],
	render: () => ({ template: '<ambience-panel-story-host />' }),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const bound = () => canvasElement.querySelector('[data-testid="bound"]');

		const motion = canvas.getByRole('combobox', {
			name: 'Motion source',
		}) as HTMLSelectElement;

		const choose = (value: string) => {
			motion.value = value;
			motion.dispatchEvent(new Event('change'));
		};

		choose('wave');
		await waitFor(() => {
			if (!bound()?.textContent?.includes('"wave"')) {
				throw new Error('the wave did not reach the model');
			}
		});

		// Tune it away from its default.
		const width = canvas.getByRole('slider', {
			name: 'Wave width',
		}) as HTMLInputElement;
		width.value = '60';
		width.dispatchEvent(new Event('input', { bubbles: true }));
		await waitFor(() => {
			if (!bound()?.textContent?.includes('0.6')) {
				throw new Error('the width did not reach the model');
			}
		});

		// Away and back.
		choose('none');
		await waitFor(() => {
			if (bound()?.textContent?.includes('"wave"')) {
				throw new Error('still on the wave');
			}
		});
		choose('wave');

		await waitFor(() => {
			if (!bound()?.textContent?.includes('0.6')) {
				throw new Error('the tuning was forgotten');
			}
		});
		await expect(
			canvas.getByRole('slider', { name: 'Wave width' }),
		).toHaveValue('60');
	},
};

/**
 * A palette: the third colour source, and the one an image gives you.
 *
 * ⚠️ It is a *colour* source and nothing more, which is the point. The wave
 * over it below comes from the motion channel, and the two know nothing about
 * each other — a pre-computed frame could not be combined that way.
 */
export const Palette: Story = {
	name: 'A palette from an image',
	args: {
		ambience: {
			colour: {
				type: 'palette',
				colours: ['#1b3a5c', '#c86a3d', '#f2c14e'],
				turnsPerSecond: 0,
			},
			motion: { type: 'wave', lapsPerSecond: 0.3, width: 0.35 },
			brightness: { type: 'fixed', level: 1 },
		},
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('combobox', { name: 'Colour source' }),
		).toHaveValue('palette');

		// One picker per colour, in order.
		for (const position of [1, 2, 3]) {
			await expect(
				canvas.getByLabelText(`Palette colour ${position}`),
			).toBeVisible();
		}
		await expect(canvas.getByLabelText('Palette colour 2')).toHaveValue(
			'#c86a3d',
		);
	},
};

/**
 * Adding and dropping colours.
 *
 * The floor is one, not zero: an empty palette has nothing to paint, and the
 * contract refuses it. The ceiling is eight, which is more than any image
 * palette worth reading.
 */
export const PaletteEditing: Story = {
	name: 'Adding and dropping colours',
	decorators: [moduleMetadata({ imports: [AmbiencePanelStoryHost] })],
	render: () => ({ template: '<ambience-panel-story-host />' }),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const bound = () => canvasElement.querySelector('[data-testid="bound"]');

		const colour = canvas.getByRole('combobox', {
			name: 'Colour source',
		}) as HTMLSelectElement;
		colour.value = 'palette';
		colour.dispatchEvent(new Event('change'));

		await waitFor(() => {
			if (!bound()?.textContent?.includes('"palette"')) {
				throw new Error('the palette did not reach the model');
			}
		});

		// Two by default, then three.
		await expect(canvas.getAllByLabelText(/^Palette colour/)).toHaveLength(2);
		await userEvent.click(
			canvas.getByRole('button', { name: 'Add a palette colour' }),
		);
		await expect(canvas.getAllByLabelText(/^Palette colour/)).toHaveLength(3);

		await userEvent.click(
			canvas.getByRole('button', { name: 'Remove palette colour 2' }),
		);
		await expect(canvas.getAllByLabelText(/^Palette colour/)).toHaveLength(2);
	},
};
