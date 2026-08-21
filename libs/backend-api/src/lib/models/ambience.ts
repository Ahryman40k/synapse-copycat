import { HexColor } from '@synapse-copycat/ui';
import {
	type InferOutput,
	literal,
	maxValue,
	minValue,
	number,
	object,
	pipe,
	variant,
} from 'valibot';

/**
 * An ambience: three channels, each fed by its own source.
 *
 * The mirror of `razer::engine::ambience` on the Rust side. Root AGENTS.md §6
 * is the reason it is a schema and not only a type — this crosses the IPC
 * boundary, so the static type is a lie until something has parsed it.
 *
 * The shape is what the backend serialises, and a Rust test fixes that exact
 * string. Each source is an object tagged by `type`, which is why `variant` is
 * the right combinator: it reads the tag first and reports the failure against
 * the one member it was actually trying, rather than a union's wall of every
 * member's complaints.
 */

/** 0 to 1, for the several places that mean a proportion. */
const Unit = pipe(number(), minValue(0), maxValue(1));

// ── colour ───────────────────────────────────────────────────────────────────

/** `HexColor` from `libs/ui`, so the picker, the palette and the wire agree. */
export const FixedColour = object({ type: literal('fixed'), rgb: HexColor });

export const RainbowColour = object({
	type: literal('rainbow'),
	turnsPerSecond: number(),
	/** How much of the wheel is visible across the device at once, in turns. */
	spread: number(),
});

export const ColourSource = variant('type', [FixedColour, RainbowColour]);
export type ColourSource = InferOutput<typeof ColourSource>;

// ── motion ───────────────────────────────────────────────────────────────────

export const NoMotion = object({ type: literal('none') });

/**
 * Both figures are fractions of the device, never columns.
 *
 * A group holds whatever the user puts in it, and in columns the same wave
 * crosses a 14-column mouse and a 100-LED strip at visibly different speeds —
 * three waves drifting apart rather than one ambience.
 */
export const Wave = object({
	type: literal('wave'),
	/** Full crossings of the device per second. */
	lapsPerSecond: number(),
	/** Width of the lit band, as a fraction of the device. */
	width: Unit,
});

/** Milliseconds. A Rust `Duration` would arrive as `{ secs, nanos }`. */
export const Pulse = object({
	type: literal('pulse'),
	period: pipe(number(), minValue(1)),
});

export const MotionSource = variant('type', [NoMotion, Wave, Pulse]);
export type MotionSource = InferOutput<typeof MotionSource>;

// ── brightness ───────────────────────────────────────────────────────────────

export const FixedBrightness = object({
	type: literal('fixed'),
	level: Unit,
});

export const Circadian = object({
	type: literal('circadian'),
	day: Unit,
	night: Unit,
});

export const BrightnessSource = variant('type', [FixedBrightness, Circadian]);
export type BrightnessSource = InferOutput<typeof BrightnessSource>;

// ── the three together ───────────────────────────────────────────────────────

export const Ambience = object({
	colour: ColourSource,
	motion: MotionSource,
	brightness: BrightnessSource,
});
export type Ambience = InferOutput<typeof Ambience>;

/**
 * What "static, one colour" means in this model: no movement, no curve.
 *
 * Mirrors `Ambience::still` so the two sides agree on what a plain colour is,
 * rather than each inventing its own default.
 */
export const still = (rgb: string): Ambience => ({
	colour: { type: 'fixed', rgb },
	motion: { type: 'none' },
	brightness: { type: 'fixed', level: 1 },
});
