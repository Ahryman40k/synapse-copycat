import {
	type InferOutput,
	integer,
	minValue,
	number,
	object,
	pipe,
	string,
} from 'valibot';
import { ParticipantId } from './group';

/**
 * A Twinkly found on the network, as `discovery::TwinklyDevice` serialises it.
 *
 * Its own file rather than a corner of `device.ts`, for the same reason the
 * kind is opaque: this is the first participant that arrives over UDP instead
 * of DBus, and the store's `toStrip` is the only thing that turns it into the
 * `Device` the interface shows.
 */
export const WireTwinklyDevice = object({
	/**
	 * `twinkly-1c9dc285dd79` — keyed by MAC, so a device that takes a new lease
	 * overnight is still the same participant. Opaque: nothing outside the
	 * backend may read it to work out what it is.
	 */
	participant: ParticipantId,
	name: string(),
	address: string(),
	/**
	 * `TWS050STQ`. ⚠️ Empty for a device that answered discovery but not HTTP,
	 * so this is deliberately not `minLength(1)` — that device exists, and
	 * dropping it would look like the sweep had missed it.
	 */
	product_code: string(),
	/** 0 for the same reason `product_code` can be empty. */
	leds: pipe(number(), integer(), minValue(0)),
	/** `RGB` or `RGBW` — four bytes per LED rather than three. */
	profile: string(),
});
export type WireTwinklyDevice = InferOutput<typeof WireTwinklyDevice>;
