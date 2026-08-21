import { componentWrapperDecorator } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import { type Ambience, still } from '@synapse-copycat/backend-api';
import { expect } from 'storybook/test';
import { AmbiencePreview } from './ambience-preview';

const meta: Meta<AmbiencePreview> = {
	// No .mdx beside this one, so Storybook generates the docs page.
	tags: ['autodocs'],
	component: AmbiencePreview,
	title: 'Synapse application / Components / ambience preview',
	decorators: [
		componentWrapperDecorator(
			(story) => `<div style="padding:1rem; max-width:28rem">${story}</div>`,
		),
	],
	args: {
		// Frozen by default. An animation that never stops makes every visual
		// diff a false positive, and a still frame shows the colours anyway —
		// `Running` is the one story that moves.
		frozenAt: 0,
		columns: 24,
	},
};

export default meta;
type Story = StoryObj<AmbiencePreview>;

const cells = (root: HTMLElement) =>
	[...root.querySelectorAll('.ambience-preview__cell')] as HTMLElement[];

export const Still: Story = {
	name: 'One colour',
	args: { ambience: still('#00ff00') },
	play: async ({ canvasElement }) => {
		const painted = cells(canvasElement);

		await expect(painted).toHaveLength(24);
		const colours = new Set(painted.map((cell) => cell.style.backgroundColor));
		await expect(colours.size).toBe(1);
	},
};

const wave: Ambience = {
	...still('#ff2200'),
	motion: { type: 'wave', lapsPerSecond: 0.5, width: 0.2 },
};

export const Wave: Story = {
	name: 'A band travelling',
	args: { ambience: wave },
	play: async ({ canvasElement }) => {
		const colours = cells(canvasElement).map(
			(cell) => cell.style.backgroundColor,
		);

		// A band, so some of it is lit and some is not. All lit or all dark
		// would both mean the motion never reached the strip.
		const dark = colours.filter((colour) => colour === 'rgb(0, 0, 0)');
		await expect(dark.length).toBeGreaterThan(0);
		await expect(dark.length).toBeLessThan(colours.length);
	},
};

export const Rainbow: Story = {
	name: 'The whole wheel',
	args: {
		ambience: {
			...still('#000000'),
			colour: { type: 'rainbow', turnsPerSecond: 0.1, spread: 1 },
		},
	},
	play: async ({ canvasElement }) => {
		const colours = new Set(
			cells(canvasElement).map((cell) => cell.style.backgroundColor),
		);

		// Spread across the strip, so nearly every cell is its own hue.
		await expect(colours.size).toBeGreaterThan(15);
	},
};

/**
 * All three at once, which is the point of the model: hue from one source,
 * movement from another, level from a third.
 */
export const Composed: Story = {
	name: 'Three sources at once',
	args: {
		ambience: {
			colour: { type: 'rainbow', turnsPerSecond: 0.2, spread: 1 },
			motion: { type: 'wave', lapsPerSecond: 0.5, width: 0.25 },
			brightness: { type: 'fixed', level: 0.6 },
		},
		frozenAt: 1.2,
	},
};

/**
 * The only story that moves.
 *
 * ⚠️ It stops on its own where the reader asked for less motion:
 * `prefers-reduced-motion` leaves the first frame up rather than animating,
 * which still shows the colours.
 */
export const Running: Story = {
	name: 'Animating',
	args: { ambience: wave, frozenAt: undefined },
	play: async ({ canvasElement }) => {
		const first = cells(canvasElement).map((c) => c.style.backgroundColor);
		await new Promise((resolve) => setTimeout(resolve, 400));
		const later = cells(canvasElement).map((c) => c.style.backgroundColor);

		// Under reduced motion the strip is meant to hold still, so this cannot
		// assert that it moved — only that it is still a strip and never went
		// blank, which is what a broken loop would leave behind.
		await expect(later).toHaveLength(first.length);
		await expect(later.some((colour) => colour !== 'rgb(0, 0, 0)')).toBe(true);
	},
};

export const Narrow: Story = {
	name: 'One cell',
	args: { ambience: still('#3355ff'), columns: 1 },
	play: async ({ canvasElement }) => {
		// A Goliathus is one LED. The preview has to survive the same case the
		// compositor does, rather than dividing by zero on the way.
		await expect(cells(canvasElement)).toHaveLength(1);
	},
};
