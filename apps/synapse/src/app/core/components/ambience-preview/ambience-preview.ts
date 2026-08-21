import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	inject,
	input,
	signal,
} from '@angular/core';
import { type Ambience, at, composeStrip } from '@synapse-copycat/backend-api';

/**
 * What an ambience looks like, drawn here rather than on a device.
 *
 * Composed in TypeScript by `composeStrip`, not fetched from the backend.
 * Shipping frames across the IPC thirty times a second to fill a row of
 * coloured boxes would be absurd, and a preview that needs a running daemon is
 * no use to the first-run wizard — which has to show an ambience before
 * anything is plugged in.
 *
 * A strip rather than a grid: every source varies along the columns and not
 * across them, so a single row shows everything a matrix would.
 */
@Component({
	selector: 'ambience-preview',
	templateUrl: './ambience-preview.html',
	styleUrl: './ambience-preview.scss',
	host: {
		role: 'img',
		'[attr.aria-label]': 'ariaLabel()',
	},
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmbiencePreview {
	readonly ambience = input.required<Ambience>();

	/** How many cells to draw. Not a device's width — a legible one. */
	readonly columns = input(24);

	/**
	 * Frozen at a chosen instant instead of running.
	 *
	 * For a story, a screenshot, or a reader who would rather it held still.
	 * Nothing here animates in a test unless a test asks it to.
	 */
	readonly frozenAt = input<number | undefined>(undefined);

	readonly ariaLabel = input('Ambience preview');

	private readonly seconds = signal(0);

	protected readonly cells = computed(() =>
		composeStrip(this.ambience(), this.columns(), at(this.seconds())),
	);

	constructor() {
		const destroyRef = inject(DestroyRef);

		afterNextRender(() => {
			const frozen = this.frozenAt();
			if (frozen !== undefined) {
				this.seconds.set(frozen);
				return;
			}

			// `prefers-reduced-motion` is honoured: an animation nobody asked
			// for is exactly what that setting is about, and a still frame still
			// shows the colours.
			const reduced =
				typeof matchMedia === 'function' &&
				matchMedia('(prefers-reduced-motion: reduce)').matches;
			if (reduced) return;

			const started = performance.now();
			let frame = 0;

			const draw = (now: number) => {
				this.seconds.set((now - started) / 1000);
				frame = requestAnimationFrame(draw);
			};
			frame = requestAnimationFrame(draw);

			// The loop outlives the component otherwise, and keeps a signal alive
			// with it — a leak per preview opened.
			destroyRef.onDestroy(() => cancelAnimationFrame(frame));
		});
	}
}
