import { Component, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { componentWrapperDecorator, moduleMetadata } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { KeyCapture } from './key-capture';

const meta: Meta<KeyCapture> = {
	component: KeyCapture,
	title: 'UI library / Key capture',
	args: { value: '', ariaLabel: 'Key combination' },
	decorators: [
		componentWrapperDecorator(
			(story) => `<div style="padding:1.5rem">${story}</div>`,
		),
	],
};

export default meta;
type Story = StoryObj<KeyCapture>;

export const Default: Story = {
	name: 'Key capture',
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('button', { name: 'Key combination' }),
		).toHaveTextContent('Not set');
	},
};

export const Set: Story = {
	name: 'Holding a combination',
	args: { value: 'Ctrl + Alt + K' },
};

// ── two-way binding ─────────────────────────────────────────────────────────

@Component({
	selector: 'syn-key-capture-story-host',
	imports: [KeyCapture],
	template: `
		<syn-key-capture [(value)]="combination" />
		<p style="margin-top:1rem; font:12px/1 sans-serif; opacity:0.7">
			bound value: {{ combination() || '(none)' }}
		</p>
	`,
})
export class KeyCaptureStoryHost {
	readonly combination = signal('');
}

/** Click it, then press a key — Escape gives up, and the × empties it. */
export const Live: Story = {
	name: 'Recording',
	decorators: [moduleMetadata({ imports: [KeyCaptureStoryHost] })],
	render: () => ({ template: '<syn-key-capture-story-host />' }),
};
