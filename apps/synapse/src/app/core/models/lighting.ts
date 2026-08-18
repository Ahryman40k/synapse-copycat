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

/** Everything the lighting section of one device holds. */
export type DeviceLighting = {
	effect: ChromaEffect;
	brightness: BrightnessChange;
};

export const DEVICE_LIGHTING_DEFAULT: DeviceLighting = {
	effect: CHROMA_EFFECT_DEFAULT,
	brightness: BRIGHTNESS_DEFAULT,
};
