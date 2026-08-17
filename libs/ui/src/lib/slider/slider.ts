import {
	booleanAttribute,
	ChangeDetectionStrategy,
	Component,
	computed,
	type ElementRef,
	effect,
	input,
	model,
	numberAttribute,
	signal,
	viewChild,
} from '@angular/core';

/**
 * Thumb diameter in px. Kept in sync with `$thumb-size` in slider.scss — the
 * bubble clamp needs it in TypeScript and CSS cannot report it back.
 */
const THUMB_SIZE = 14;

/** `numberAttribute` turns an absent value into NaN; a limit may be absent. */
function optionalNumber(value: unknown): number | undefined {
	if (value === undefined || value === null || value === '') return undefined;

	const parsed = Number(value);
	return Number.isNaN(parsed) ? undefined : parsed;
}

@Component({
	selector: 'syn-slider',
	templateUrl: './slider.html',
	styleUrl: './slider.scss',
	host: {
		'[style.--syn-slider-fill]': 'fillPercent()',
		'[class.syn-slider--disabled]': 'disabled()',
		'[class.syn-slider--bubble-on-demand]': '!bubbleAlwaysVisible()',
	},
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SliderComponent {
	// ── inputs ────────────────────────────────────────────────────────────────

	readonly min = input(0, { transform: numberAttribute });
	readonly max = input(100, { transform: numberAttribute });

	/**
	 * Where the thumb stops, while the track keeps spanning `min`..`max`.
	 *
	 * For sliders that depend on one another — a set of DPI stages that must
	 * stay in order — narrowing `min`/`max` instead would give each its own
	 * scale, so the same position would mean a different value on each track
	 * and the five could not be read against each other. These hold the thumb
	 * without touching the scale.
	 */
	readonly limitMin = input(undefined, { transform: optionalNumber });
	readonly limitMax = input(undefined, { transform: optionalNumber });
	readonly step = input(1, { transform: numberAttribute });

	readonly disabled = input(false, { transform: booleanAttribute });

	/** Render the value bubble at all. */
	readonly showBubble = input(true, { transform: booleanAttribute });

	/**
	 * When false the bubble only appears on hover / keyboard focus. It stays in
	 * the DOM either way so its width remains measurable for the clamp.
	 */
	readonly bubbleAlwaysVisible = input(true, { transform: booleanAttribute });

	/** Accessible name. A slider with no visible label needs one. */
	readonly ariaLabel = input<string | undefined>(undefined);

	/**
	 * What the two ends of the scale read as. They show the bare numbers unless
	 * told otherwise — a scale whose ends mean something ("cool" / "warm") says
	 * more than 2000 and 7500 do. Decoration either way: the scale is
	 * `aria-hidden`, and the input carries the real min and max.
	 */
	readonly minLabel = input<string | undefined>(undefined);
	readonly maxLabel = input<string | undefined>(undefined);

	/** Two-way. `valueChange` is the `onChange` of the design spec. */
	readonly value = model(0);

	// ── measurements ──────────────────────────────────────────────────────────

	private readonly inputRange =
		viewChild<ElementRef<HTMLInputElement>>('inputRange');
	private readonly bubble = viewChild<ElementRef<HTMLElement>>('bubble');

	private readonly trackWidth = signal(0);
	private readonly bubbleWidth = signal(0);

	constructor() {
		// offsetWidth is not reactive, so the previous implementation never
		// recomputed on resize. Observe the elements instead.
		effect((onCleanup) => {
			const track = this.inputRange()?.nativeElement;
			if (!track) return;
			const bubble = this.bubble()?.nativeElement;

			const measure = () => {
				this.trackWidth.set(track.clientWidth);
				this.bubbleWidth.set(bubble?.offsetWidth ?? 0);
			};
			measure();

			// jsdom (unit tests) has no ResizeObserver; the initial measure is
			// enough there.
			if (typeof ResizeObserver === 'undefined') return;

			const observer = new ResizeObserver(measure);
			observer.observe(track);
			if (bubble) observer.observe(bubble);
			onCleanup(() => observer.disconnect());
		});
	}

	// ── derived state ─────────────────────────────────────────────────────────

	/** Position of the value within [min, max], as 0..1. */
	protected readonly ratio = computed(() => {
		const span = this.max() - this.min();
		if (span <= 0) return 0;
		return Math.min(1, Math.max(0, (this.value() - this.min()) / span));
	});

	/** Drives the two-colour track gradient, via a CSS custom property. */
	protected readonly fillPercent = computed(() => `${this.ratio() * 100}%`);

	/**
	 * Centre of the thumb in px. The native thumb is inset by half its width at
	 * both ends so its circle never overflows the track.
	 */
	private readonly thumbCentre = computed(
		() => THUMB_SIZE / 2 + this.ratio() * (this.trackWidth() - THUMB_SIZE),
	);

	/**
	 * Bubble offset in px, centred on the thumb but clamped inside the track:
	 * `clamp(0, thumbCentre - bubbleWidth / 2, trackWidth - bubbleWidth)`.
	 */
	protected readonly bubbleLeft = computed(() => {
		const track = this.trackWidth();
		const bubble = this.bubbleWidth();
		if (!track || !bubble) return 0;
		return Math.min(
			Math.max(this.thumbCentre() - bubble / 2, 0),
			track - bubble,
		);
	});

	// ── events ────────────────────────────────────────────────────────────────

	protected onInput(event: Event): void {
		const target = event.target;
		if (!(target instanceof HTMLInputElement)) return;

		const raw = target.valueAsNumber;
		if (Number.isNaN(raw)) return;

		const next = Math.min(
			this.limitMax() ?? this.max(),
			Math.max(this.limitMin() ?? this.min(), raw),
		);

		// Put the thumb back in the same handler. The native range has already
		// moved itself to `raw`, and if `next` matches the value we were already
		// holding, no binding would change and nothing would rewrite the DOM —
		// the thumb would sit past its limit with the model saying otherwise.
		if (next !== raw) target.value = String(next);

		this.value.set(next);
	}
}
