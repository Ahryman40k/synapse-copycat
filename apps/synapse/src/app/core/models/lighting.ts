import { DEFAULT_SOURCE } from '@synapse-copycat/ui';
import type { ChromaEffect } from './chroma-effect';
import { CHROMA_EFFECT_DEFAULT } from './chroma-effect';

/**
 * Brightness is two things at once: whether the device is lit at all, and how
 * much. A level of 0 is not the same as being off — turning it back on has to
 * find the level where it was left.
 */
export type BrightnessChange = {
	activated: boolean;
	value: number;
};

export const BRIGHTNESS_DEFAULT: BrightnessChange = {
	activated: true,
	value: 100,
};

/**
 * Which way a wave travels — one of exactly two, whatever the device.
 *
 * Named for the wire rather than for an arrow, because the arrow is not the
 * same on every device. OpenRazer sends an int, and its drivers document the
 * two values differently by class:
 *
 * | value     | mouse          | keyboard              | accessory      |
 * | --------- | -------------- | --------------------- | -------------- |
 * | `forward` | up the mouse   | left across the board | anticlockwise  |
 * | `reverse` | down           | right                 | clockwise      |
 *
 * Three readings of the same two values, one per driver — `razermouse_driver.c`,
 * `razerkbd_driver.c` and `razeraccessory_driver.c` each document them in their
 * own words. So the panel draws the arrows that suit what it is showing, and
 * this type stays true for all three.
 *
 * There are never more than two: every `WAVE_DIRS` in OpenRazer is a pair —
 * `(1, 2)`, or `(0, 1)` on twelve devices, which is a wire detail for the
 * backend to map, not a third direction.
 */
export type WaveDirection = 'forward' | 'reverse';

/** Which pair of arrows says "these two directions" for a given device. */
export type WaveOrientation = 'vertical' | 'horizontal' | 'rotary';

/**
 * The colours a breathing effect alternates between.
 *
 * The three states map exactly onto the three calls OpenRazer exposes, and
 * every lighting-capable device in the mock has all three:
 *
 * | here                        | OpenRazer            |
 * | --------------------------- | -------------------- |
 * | `second: undefined`         | `setBreathSingle`    |
 * | `second` set                | `setBreathDual`      |
 * | `random: true`              | `setBreathRandom`    |
 */
export type BreatheSettings = {
	first: string;
	/** `undefined` is *no second colour* — a single-colour breath. */
	second: string | undefined;
	/** A new colour each breath, chosen by the device. Overrides both above. */
	random: boolean;
};

/**
 * What each effect needs beyond its own name.
 *
 * Held for every effect at once rather than only the current one: switching to
 * spectrum and back should not lose the colour that was picked. Nothing here
 * applies to `none` or `spectrum` — they take no settings, which is why the
 * panel shows nothing for them.
 */
export type EffectSettings = {
	/** `static` */
	color: string;
	/** `wave` */
	direction: WaveDirection;
	/** `breathe` */
	breathe: BreatheSettings;
};

/**
 * The theme's source colour, so an untouched device and first paint agree.
 * Razer green either way — one literal, not two.
 */
export const EFFECT_SETTINGS_DEFAULT: EffectSettings = {
	color: DEFAULT_SOURCE,
	direction: 'forward',
	breathe: { first: DEFAULT_SOURCE, second: undefined, random: false },
};

/** Everything the lighting section of one device holds. */
export type DeviceLighting = {
	effect: ChromaEffect;
	brightness: BrightnessChange;
	settings: EffectSettings;
};

export const DEVICE_LIGHTING_DEFAULT: DeviceLighting = {
	effect: CHROMA_EFFECT_DEFAULT,
	brightness: BRIGHTNESS_DEFAULT,
	settings: EFFECT_SETTINGS_DEFAULT,
};
