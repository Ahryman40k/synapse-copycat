import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { type Ambience, still } from '@synapse-copycat/backend-api';
import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { expect, waitFor, within } from 'storybook/test';
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
