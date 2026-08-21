import {
	ChangeDetectionStrategy,
	Component,
	computed,
	model,
} from '@angular/core';
import type {
	Ambience,
	BrightnessSource,
	ColourSource,
	MotionSource,
} from '@synapse-copycat/backend-api';
import {
	type SelectOption,
	ColorPicker,
	Panel,
	Select,
	SliderComponent,
} from '@synapse-copycat/ui';

/**
 * The three channels of an ambience, and whatever each one's source needs.
 *
 * The panel is the model made visible: colour, motion and brightness are
 * chosen independently, so the wallpaper can decide the hue while audio decides
 * the movement and the hour decides how bright it all is. Nothing has to win,
 * because they are not asking for the same thing.
 *
 * `none` and the sources with no settings show nothing further — a row of
 * controls that do nothing says less than an empty row.
 */

type ColourKind = ColourSource['type'];
type MotionKind = MotionSource['type'];
type BrightnessKind = BrightnessSource['type'];

const COLOUR_SOURCES: readonly SelectOption[] = [
	{ value: 'fixed', label: 'One colour' },
	{ value: 'rainbow', label: 'Rainbow' },
];

const MOTION_SOURCES: readonly SelectOption[] = [
	{ value: 'none', label: 'Still' },
	{ value: 'wave', label: 'Wave' },
	{ value: 'pulse', label: 'Pulse' },
];

const BRIGHTNESS_SOURCES: readonly SelectOption[] = [
	{ value: 'fixed', label: 'One level' },
	{ value: 'circadian', label: 'Follow the hour' },
];

/** What a source starts as when it is first chosen. */
const DEFAULTS = {
	colour: {
		fixed: { type: 'fixed', rgb: '#00ff00' },
		rainbow: { type: 'rainbow', turnsPerSecond: 0.2, spread: 1 },
	},
	motion: {
		none: { type: 'none' },
		wave: { type: 'wave', lapsPerSecond: 0.5, width: 0.2 },
		pulse: { type: 'pulse', period: 2000 },
	},
	brightness: {
		fixed: { type: 'fixed', level: 1 },
		circadian: { type: 'circadian', day: 1, night: 0.2 },
	},
} as const;

@Component({
	selector: 'ambience-panel',
	templateUrl: './ambience-panel.html',
	styleUrl: './ambience-panel.scss',
	imports: [Panel, Select, SliderComponent, ColorPicker],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmbiencePanel {
	protected readonly colourSources = COLOUR_SOURCES;
	protected readonly motionSources = MOTION_SOURCES;
	protected readonly brightnessSources = BRIGHTNESS_SOURCES;

	readonly ambience = model.required<Ambience>();

	/** Nothing can be changed — a group someone else is editing, or a preview. */
	readonly disabled = model(false);

	/**
	 * What each source was last tuned to, so switching away and back does not
	 * lose it.
	 *
	 * Kept here rather than in `Ambience`, which carries only the source that
	 * is active: the wire shape should describe what is showing, not everything
	 * the user has tried. The cost is that it is forgotten when the panel is
	 * destroyed, which is the right trade for a convenience.
	 */
	readonly #remembered = {
		colour: new Map<ColourKind, ColourSource>(),
		motion: new Map<MotionKind, MotionSource>(),
		brightness: new Map<BrightnessKind, BrightnessSource>(),
	};

	protected readonly colour = computed(() => this.ambience().colour);
	protected readonly motion = computed(() => this.ambience().motion);
	protected readonly brightness = computed(() => this.ambience().brightness);

	/**
	 * The active source, narrowed, or `undefined`.
	 *
	 * The template cannot do this itself: Angular checks
	 * `colour().type === 'fixed' ? colour().rgb : ''` as two unrelated calls and
	 * never narrows the second, so `rgb` is not a property of the union. Narrowed
	 * here and taken with `@if (… ; as …)`, each block sees one concrete source
	 * and the compiler agrees.
	 */
	protected readonly fixedColour = computed(() => {
		const colour = this.colour();
		return colour.type === 'fixed' ? colour : undefined;
	});
	protected readonly rainbow = computed(() => {
		const colour = this.colour();
		return colour.type === 'rainbow' ? colour : undefined;
	});
	protected readonly wave = computed(() => {
		const motion = this.motion();
		return motion.type === 'wave' ? motion : undefined;
	});
	protected readonly pulse = computed(() => {
		const motion = this.motion();
		return motion.type === 'pulse' ? motion : undefined;
	});
	protected readonly fixedLevel = computed(() => {
		const brightness = this.brightness();
		return brightness.type === 'fixed' ? brightness : undefined;
	});
	protected readonly circadian = computed(() => {
		const brightness = this.brightness();
		return brightness.type === 'circadian' ? brightness : undefined;
	});

	// ── choosing a source ─────────────────────────────────────────────────────

	protected onColourKind(kind: string | undefined): void {
		if (!kind) return;
		this.#remember('colour', this.colour());
		this.#patch({
			colour: (this.#remembered.colour.get(kind as ColourKind) ??
				DEFAULTS.colour[kind as ColourKind]) as ColourSource,
		});
	}

	protected onMotionKind(kind: string | undefined): void {
		if (!kind) return;
		this.#remember('motion', this.motion());
		this.#patch({
			motion: (this.#remembered.motion.get(kind as MotionKind) ??
				DEFAULTS.motion[kind as MotionKind]) as MotionSource,
		});
	}

	protected onBrightnessKind(kind: string | undefined): void {
		if (!kind) return;
		this.#remember('brightness', this.brightness());
		this.#patch({
			brightness: (this.#remembered.brightness.get(kind as BrightnessKind) ??
				DEFAULTS.brightness[kind as BrightnessKind]) as BrightnessSource,
		});
	}

	// ── tuning the chosen source ──────────────────────────────────────────────

	protected onColour(rgb: string | undefined): void {
		// The picker is not `clearable`, so `undefined` cannot arrive.
		if (rgb) this.#patch({ colour: { type: 'fixed', rgb } });
	}

	protected onRainbow(field: 'turnsPerSecond' | 'spread', value: number): void {
		const colour = this.colour();
		if (colour.type !== 'rainbow') return;
		this.#patch({ colour: { ...colour, [field]: this.#hundredth(value) } });
	}

	protected onWave(field: 'lapsPerSecond' | 'width', value: number): void {
		const motion = this.motion();
		if (motion.type !== 'wave') return;
		this.#patch({ motion: { ...motion, [field]: this.#hundredth(value) } });
	}

	/** The slider is in tenths of a second; the wire is in milliseconds. */
	protected onPulse(value: number): void {
		this.#patch({
			motion: { type: 'pulse', period: Math.max(1, value * 100) },
		});
	}

	protected onLevel(value: number): void {
		this.#patch({
			brightness: { type: 'fixed', level: this.#hundredth(value) },
		});
	}

	protected onCircadian(field: 'day' | 'night', value: number): void {
		const brightness = this.brightness();
		if (brightness.type !== 'circadian') return;
		this.#patch({
			brightness: { ...brightness, [field]: this.#hundredth(value) },
		});
	}

	// ── reading a source back onto a slider ───────────────────────────────────

	/**
	 * Sliders work in whole numbers, the model in 0..1. Every conversion goes
	 * through these two, so a rounding difference cannot creep in on one side.
	 */
	protected percent(value: number): number {
		return Math.round(value * 100);
	}

	protected pulseTenths(): number {
		const motion = this.motion();
		return motion.type === 'pulse' ? Math.round(motion.period / 100) : 20;
	}

	#hundredth(value: number): number {
		return Math.min(1, Math.max(0, value / 100));
	}

	#patch(part: Partial<Ambience>): void {
		this.ambience.update((ambience) => ({ ...ambience, ...part }));
	}

	#remember<K extends 'colour' | 'motion' | 'brightness'>(
		channel: K,
		source: Ambience[K],
	): void {
		// One map per channel, keyed by the source's tag.
		(this.#remembered[channel] as Map<string, Ambience[K]>).set(
			source.type,
			source,
		);
	}
}
