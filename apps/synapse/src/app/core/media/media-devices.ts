import { InjectionToken } from '@angular/core';

/**
 * `navigator.mediaDevices`, injected rather than reached for.
 *
 * Undefined wherever there is none — an insecure origin, a browser without it,
 * jsdom in a spec — so every caller has to say what it does in that case
 * instead of throwing on a property of `undefined`. It is also the seam a test
 * or a story replaces to run the whole flow with no camera attached.
 */
export const MEDIA_DEVICES = new InjectionToken<MediaDevices | undefined>(
	'MEDIA_DEVICES',
	{
		providedIn: 'root',
		factory: () => globalThis.navigator?.mediaDevices,
	},
);
