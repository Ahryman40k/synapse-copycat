import {
	type InferOutput,
	boolean,
	hexColor,
	length,
	object,
	pipe,
	string,
} from 'valibot';

/**
 * What a light strip reports about itself: lit or dark, and the one static
 * colour it stores.
 *
 * Parsed, not cast — the answer crosses the IPC boundary (root AGENTS.md §6),
 * and the colour drives a native `<input type="color">`, which silently reads
 * anything but `#rrggbb` as black. `hexColor()` alone also admits `#fff` and
 * `#rrggbbaa`; the `length(7)` is what pins the one form everything here
 * speaks (§8).
 */
export const StripLighting = object({
	on: boolean(),
	color: pipe(string(), hexColor(), length(7)),
});
export type StripLighting = InferOutput<typeof StripLighting>;

/**
 * What a strip shows before its first answer arrives — the read is a network
 * round trip, and the panel renders immediately. Dark, deliberately: claiming
 * "lit" about a device that was never asked promises what may not be true,
 * and the switch flipping to the real answer a moment later reads as the
 * panel finding out, which is what is happening.
 */
export const STRIP_LIGHTING_DEFAULT: StripLighting = {
	on: false,
	color: '#00ff00',
};
