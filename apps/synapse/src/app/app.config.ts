import {
	type ApplicationConfig,
	inject,
	provideAppInitializer,
	provideBrowserGlobalErrorListeners,
	// provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import {
	type Mock,
	mockGroups,
	provideBackendApi,
	withMock,
} from '@synapse-copycat/backend-api';
import { appRoutes } from './app.routes';
import { AmbienceTheme } from './core/theming/ambience-theme';
import type { ApplicationConfig as Config } from './models/config';

export const baseProviders = [
	provideBrowserGlobalErrorListeners(),
	// provideZoneChangeDetection({ eventCoalescing: true }),
	provideRouter(appRoutes, withComponentInputBinding()),

	// Asked for, not kept. `AmbienceTheme` exists for its effect, which ties the
	// palette to what the first group is showing, and a root service nobody
	// injects is never constructed — the theme would silently stay on its
	// default. Bootstrapping rather than layout, so it lives here and not in the
	// shell component.
	provideAppInitializer(() => {
		inject(AmbienceTheme);
	}),
];

export function makeAppConfig(config: Config) {
	const isTauri = (): boolean => !!(window as any).__TAURI_INTERNALS__;
	const isTauriDetected = isTauri();

	console.log('Tauri detected', isTauriDetected);
	console.log('Use configuration', config);
	const mock = !isTauriDetected
		? ({
				// ⚠️ The devices the fake daemon reports, verbatim — serials,
				// names and ids. The browser path used to invent its own, which
				// is how a mismatch between the serial the backend names a
				// participant by and the id the store built went unseen: both
				// halves were invented here and agreed with each other.
				//
				// Mirroring the fake daemon means the two modes show the same
				// thing, and a difference between them is a real difference.
				devices: [
					{
						serial: 'XX0000000088',
						kind: 'mouse',
						name: 'Razer Basilisk Ultimate Receiver',
						vendor_id: 5426,
						product_id: 136,
					},
					{
						serial: 'XX0000000226',
						kind: 'keyboard',
						name: 'Razer Huntsman Elite',
						vendor_id: 5426,
						product_id: 550,
					},
					{
						// A keypad is a small keyboard, and the daemon publishes
						// exactly the interfaces a Huntsman does.
						serial: 'XX000000022B',
						kind: 'keyboard',
						name: 'Razer Tartarus V2',
						vendor_id: 5426,
						product_id: 555,
					},
					{
						serial: 'XX0000000C02',
						kind: 'mousemat',
						name: 'Razer Goliathus Extended',
						vendor_id: 5426,
						product_id: 3074,
					},
					{
						// No matrix at all, so the engine can only give it one
						// averaged colour — which is the case the interface has
						// to state rather than treat as a failure.
						serial: 'XX0000000527',
						kind: 'headset',
						name: 'Razer Kraken Ultimate',
						vendor_id: 5426,
						product_id: 1319,
					},
					{
						serial: 'XX0000000F08',
						kind: 'accessory',
						name: 'Razer Base Station Chroma',
						vendor_id: 5426,
						product_id: 3848,
					},
				],

				modules: [
					{
						kind: 'twinkly',
						name: 'Twinlky',
					},
				],

				// One Twinkly, shaped exactly like the one on the bench — a
				// TWS050STQ with 50 RGB LEDs. The browser path has no network
				// sweep, so this is where the interface for a network
				// participant gets built and seen.
				twinkly_devices: [
					{
						participant: 'twinkly-1c9dc285dd79',
						name: 'Twinkly_85DD79',
						address: '192.168.1.201',
						product_code: 'TWS050STQ',
						leds: 50,
						profile: 'RGB',
					},
				],

				// The group commands change things, so they cannot be a table of
				// fixed answers — `mockGroups` keeps the state, and the one rule
				// worth keeping: a participant belongs to at most one group.
				//
				// Seeded with **serials**, because that is what the backend names
				// a participant by. Seeded with anything else, every tile in a
				// group shows a raw identifier and no picture — which is what
				// happened against a real daemon while this list held invented
				// `<vendor>-<product>` strings.
				...mockGroups([
					'XX0000000088',
					'XX0000000226',
					'XX000000022B',
					'XX0000000C02',
					'XX0000000527',
					'XX0000000F08',
				]),
			} satisfies Mock)
		: undefined;

	return {
		providers: [
			...baseProviders,
			mock ? provideBackendApi(withMock(mock)) : provideBackendApi(),
		],
	} satisfies ApplicationConfig;
}
