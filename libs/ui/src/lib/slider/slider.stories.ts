import { Component, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { componentWrapperDecorator, moduleMetadata } from '@storybook/angular';
import { expect, fireEvent, waitFor, within } from 'storybook/test';
import { SliderComponent } from './slider';

// ── test helpers ────────────────────────────────────────────────────────────
// Everything comes from `storybook/test`, which re-exports @testing-library/dom
// *instrumented*: each query and event shows up as a replayable step in the
// Interactions panel. Importing @testing-library/angular directly loses that.
//
// These run in a real browser, so they cover what the jsdom unit tests cannot:
// anything that depends on measured layout — above all the bubble clamp.

const bubbleOf = (root: HTMLElement) =>
	root.querySelector<HTMLElement>('.syn-slider__bubble');

const trackOf = (root: HTMLElement) =>
	root.querySelector<HTMLInputElement>('.syn-slider__input');

/**
 * The component host.
 *
 * NOT `canvasElement.firstElementChild`: the meta wraps every story in a sizing
 * `<div>`, so the first child is that wrapper.
 */
const hostOf = (root: HTMLElement) =>
	root.querySelector<HTMLElement>('syn-slider');

/**
 * Read a custom property off the host.
 *
 * NOT `toHaveStyle({'--syn-slider-fill': …})`: jest-dom normalises the expected
 * declaration through the CSS parser, which drops custom properties entirely,
 * so the assertion compares against nothing and always fails.
 */
const fillOf = (root: HTMLElement) =>
	hostOf(root)?.style.getPropertyValue('--syn-slider-fill');

/**
 * `waitFor` callbacks must stay synchronous and signal failure by throwing:
 * @testing-library/dom types them `() => T extends Promise<any> ? never : T`,
 * and Storybook's `expect` returns a Promise. Asserting inside the callback
 * would both fail to typecheck and leave a floating promise the retry loop
 * never observes. So: plain throws to retry, Storybook assertions afterwards.
 */
const waitForLayout = async (root: HTMLElement) => {
	let bubbleBox!: DOMRect;
	let trackBox!: DOMRect;

	await waitFor(() => {
		const bubble = bubbleOf(root);
		const track = trackOf(root);
		if (!bubble || !track) throw new Error('slider not rendered yet');

		bubbleBox = bubble.getBoundingClientRect();
		trackBox = track.getBoundingClientRect();

		// Width is only known once laid out.
		if (bubbleBox.width === 0) throw new Error('bubble not laid out yet');
	});

	return { bubbleBox, trackBox };
};

/** The bubble must stay inside the track at every position. */
const expectBubbleWithinTrack = async (root: HTMLElement) => {
	const { bubbleBox, trackBox } = await waitForLayout(root);

	await expect(bubbleBox.left).toBeGreaterThanOrEqual(trackBox.left - 0.5);
	await expect(bubbleBox.right).toBeLessThanOrEqual(trackBox.right + 0.5);
};

/** Retry until the bubble shows `text`, then assert it for the report. */
const expectBubbleText = async (root: HTMLElement, text: string) => {
	await waitFor(() => {
		if (bubbleOf(root)?.textContent?.trim() !== text) {
			throw new Error(`bubble has not reached "${text}" yet`);
		}
	});

	await expect(bubbleOf(root)).toHaveTextContent(text);
};

const meta: Meta<SliderComponent> = {
	component: SliderComponent,
	title: 'UI library / Slider',
	argTypes: {
		min: { control: { type: 'number' } },
		max: { control: { type: 'number' } },
		step: { control: { type: 'number' } },
		value: { control: { type: 'number' } },
		disabled: { control: { type: 'boolean' } },
		showBubble: { control: { type: 'boolean' } },
		bubbleAlwaysVisible: { control: { type: 'boolean' } },
	},
	args: {
		min: 0,
		max: 100,
		step: 1,
		value: 50,
		disabled: false,
		showBubble: true,
		bubbleAlwaysVisible: true,
	},
	// The slider is width-driven: the bubble clamp and the thumb inset are both
	// computed from the rendered track width, so give every story a real width.
	decorators: [
		componentWrapperDecorator(
			(story) => `<div style="width: 420px; padding: 1rem">${story}</div>`,
		),
	],
};

export default meta;
type Story = StoryObj<SliderComponent>;

export const Default: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		const slider = canvas.getByRole('slider');
		await expect(slider).toHaveValue('50');
		await expect(bubbleOf(canvasElement)).toHaveTextContent('50');
		await expect(fillOf(canvasElement)).toBe('50%');

		// Move the thumb the way a browser does: set the value, then fire the
		// input event the component listens to.
		fireEvent.input(slider, { target: { value: '85' } });

		// The whole reactive chain follows: bubble text, track fill, and the
		// bubble staying inside the track.
		await expectBubbleText(canvasElement, '85');
		await expect(fillOf(canvasElement)).toBe('85%');
		await expectBubbleWithinTrack(canvasElement);
	},
};

/**
 * Value at the maximum: the track is entirely accent-coloured and the bubble is
 * clamped against the right edge rather than centred on the thumb.
 */
export const AtMaximum: Story = {
	name: 'At maximum (bubble clamped right)',
	args: { value: 100 },
	play: async ({ canvasElement }) => {
		await expectBubbleText(canvasElement, '100');
		await expectBubbleWithinTrack(canvasElement);
	},
};

/** Mirror case — the bubble cannot overflow past the left edge either. */
export const AtMinimum: Story = {
	name: 'At minimum (bubble clamped left)',
	args: { value: 0 },
	play: async ({ canvasElement }) => {
		await expectBubbleText(canvasElement, '0');
		await expectBubbleWithinTrack(canvasElement);
	},
};

/** Non-default range and coarse step, to check the min/max scale labels. */
export const SteppedRange: Story = {
	name: 'Stepped range 200–3200',
	args: { min: 200, max: 3200, step: 100, value: 1600 },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		const slider = canvas.getByRole('slider');
		await expect(slider).toHaveAttribute('step', '100');

		// (1600 - 200) / (3200 - 200) = 46.66…%
		await expect(fillOf(canvasElement)).toBe(`${((1600 - 200) / 3000) * 100}%`);
		await expect(canvas.getByText('200')).toBeVisible();
		await expect(canvas.getByText('3200')).toBeVisible();
	},
};

/**
 * The real disabled case: the BRIGHTNESS toggle in the panel header switched
 * off. Track, thumb and bubble drop to 35% and the control stops taking events.
 */
export const Disabled: Story = {
	args: { disabled: true, value: 70 },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByRole('slider')).toBeDisabled();
		await expect(hostOf(canvasElement)).toHaveClass('syn-slider--disabled');
	},
};

/** Bare track, for dense layouts where the value is displayed elsewhere. */
export const WithoutBubble: Story = {
	args: { showBubble: false },
};

/** Bubble revealed on hover or keyboard focus instead of being persistent. */
export const BubbleOnDemand: Story = {
	name: 'Bubble on hover / focus only',
	args: { bubbleAlwaysVisible: false, value: 35 },
};

// ── two-way binding ─────────────────────────────────────────────────────────

@Component({
	selector: 'syn-slider-story-host',
	imports: [SliderComponent],
	template: `
		<syn-slider
			[(value)]="brightness"
			[min]="0"
			[max]="100"
			ariaLabel="Brightness"
		/>
		<p style="margin-top: 1.5rem; font: 12px/1 sans-serif; opacity: 0.7">
			bound value: {{ brightness() }}
		</p>
	`,
})
export class SliderStoryHost {
	readonly brightness = signal(40);
}

/**
 * `value` is a `model()`, so `[(value)]` works and `valueChange` is the
 * `onChange` of the design spec. Drag the thumb and watch the bound signal.
 */
// Typed against the host: this story renders a different component, so the
// slider's own args do not apply to it.
export const TwoWayBinding: StoryObj<SliderStoryHost> = {
	name: 'Two-way binding',
	decorators: [moduleMetadata({ imports: [SliderStoryHost] })],
	render: () => ({
		template: '<syn-slider-story-host />',
	}),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const slider = canvas.getByRole('slider', { name: 'Brightness' });

		await expect(await canvas.findByText(/bound value: 40/)).toBeVisible();

		fireEvent.input(slider, { target: { value: '85' } });

		// The parent signal follows through the two-way binding, not just the
		// slider's own view.
		await waitFor(() => {
			if (!canvasElement.textContent?.includes('bound value: 85')) {
				throw new Error('parent signal has not caught up');
			}
		});
		await expect(await canvas.findByText(/bound value: 85/)).toBeVisible();
		await expectBubbleText(canvasElement, '85');
	},
};
