import { Component } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { expect, waitFor } from 'storybook/test';
import { Masonry } from './masonry';

/**
 * Boxes of deliberately mismatched heights — the case a plain grid gets wrong.
 *
 * The consumer owns `display: grid`, the columns and the gap; everything the
 * packing needs comes from the directive.
 */
@Component({
	selector: 'syn-masonry-story-host',
	imports: [Masonry],
	template: `
		<div
			synMasonry
			style="display:grid; grid-template-columns:repeat(2, 1fr); column-gap:16px; width:32rem"
		>
			@for (height of heights; track $index) {
				<div
					[attr.data-box]="$index"
					[style.height.px]="height"
					style="background:#48c242; border-radius:0.5rem; color:#000;
					       font:12px/1 sans-serif; padding:0.5rem; box-sizing:border-box"
				>
					{{ $index }} — {{ height }}px
				</div>
			}
		</div>
	`,
})
export class MasonryStoryHost {
	readonly heights = [160, 80, 60, 120];
}

const meta: Meta<MasonryStoryHost> = {
	component: MasonryStoryHost,
	title: 'UI library / Masonry',
	decorators: [moduleMetadata({ imports: [MasonryStoryHost] })],
};

export default meta;
type Story = StoryObj<MasonryStoryHost>;

const GAP = 16;

const box = (root: HTMLElement, index: number) =>
	(
		root.querySelector(`[data-box="${index}"]`) as HTMLElement
	).getBoundingClientRect();

/** Resolves once the directive has written its first spans. */
const measured = (root: HTMLElement) =>
	waitFor(() => {
		const item = root.querySelector('[data-box="2"]') as HTMLElement;
		if (!item.style.gridRowEnd) throw new Error('not measured yet');
	});

/**
 * Box 2 sits under box 0, against it — not against the bottom of the row, which
 * box 0 is the tallest of. On a plain grid there would be an 80px hole there.
 */
export const Packed: Story = {
	name: 'Items pack, they do not line up',
	render: () => ({ template: '<syn-masonry-story-host />' }),
	play: async ({ canvasElement }) => {
		await measured(canvasElement);

		// Pinned by index: 0 and 2 in the first column, 1 and 3 in the second.
		await expect(box(canvasElement, 2).left).toBe(box(canvasElement, 0).left);
		await expect(box(canvasElement, 3).left).toBe(box(canvasElement, 1).left);

		// And packed against the item above it in its own column.
		await expect(
			Math.round(box(canvasElement, 2).top - box(canvasElement, 0).bottom),
		).toBe(GAP);
		await expect(
			Math.round(box(canvasElement, 3).top - box(canvasElement, 1).bottom),
		).toBe(GAP);
	},
};

/**
 * The point of pinning by index rather than filling the shortest column: an
 * item that grows moves only what is under it, and never changes column.
 *
 * Left to auto-placement this is where a masonry misbehaves — an item drops
 * into whichever column is shortest at the time, so growing one moves another
 * sideways.
 */
export const Stable: Story = {
	name: 'Growing an item moves only its own column',
	render: () => ({ template: '<syn-masonry-story-host />' }),
	play: async ({ canvasElement }) => {
		await measured(canvasElement);

		const settled = box(canvasElement, 2);
		const before = box(canvasElement, 3).top;

		// Grow box 1 — the top of the *other* column.
		const grown = canvasElement.querySelector('[data-box="1"]') as HTMLElement;
		grown.style.height = '200px';

		await waitFor(() => {
			if (box(canvasElement, 3).top === before) {
				throw new Error('not reflowed yet');
			}
		});

		// Box 3 followed it down; box 2, in the other column, did not move at all.
		await expect(box(canvasElement, 3).top).toBeGreaterThan(before);
		await expect(box(canvasElement, 2).top).toBe(settled.top);
		await expect(box(canvasElement, 2).left).toBe(settled.left);
	},
};
