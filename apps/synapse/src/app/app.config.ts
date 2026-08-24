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
	mockTwinkly,
	mockWallpapers,
	provideBackendApi,
	withMock,
} from '@synapse-copycat/backend-api';
import { appRoutes } from './app.routes';
import { ApplicationStore } from './core/stores/application-store';
import { WallpapersStore } from './core/stores/wallpapers-store';
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

		// ⚠️ Asked for here so the wallpaper library is part of the shell rather
		// than of the tab that shows it. Moving the file into `core/stores` was
		// not enough and could not be: what lands in a lazy chunk is decided by
		// the import graph, not by where a file sits, and the backgrounds page
		// was the only thing importing it. Referenced from the application's own
		// configuration, it is in the first bundle — so the folder is known
		// before the tab is ever opened, and anything else that wants the
		// palette can have it without dragging a page in behind it.
		inject(WallpapersStore);
	}),

	// Plug and unplug, without a reload: the store subscribes to the backend's
	// events and asserts the Twinkly watch from the saved preference. In the
	// browser the mock holds the subscriptions and nothing ever fires — the
	// same code path, with no hardware behind it.
	provideAppInitializer(() => {
		void inject(ApplicationStore).watchForChanges();
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

				// The browser has no network to watch; the switch still answers.
				watch_twinkly: null,

				// The group commands change things, so they cannot be a table of
				// fixed answers — `mockGroups` keeps the state, and the one rule
				// worth keeping: a participant belongs to at most one group.
				//
				// Seeded with **serials**, because that is what the backend names
				// a participant by. Seeded with anything else, every tile in a
				// group shows a raw identifier and no picture — which is what
				// happened against a real daemon while this list held invented
				// `<vendor>-<product>` strings.
				// No filesystem in a browser and no native picker, so the folder
				// and its pictures are invented — in the shape the backend sends.
				...mockWallpapers(),

				...mockGroups([
					'XX0000000088',
					'XX0000000226',
					'XX000000022B',
					'XX0000000C02',
					'XX0000000527',
					'XX0000000F08',
				]),

				// The strip above, controllable: lit or dark, one static
				// colour. Stateful for the same reason the groups are — the
				// panel writes, then reads what it wrote.
				...mockTwinkly(['twinkly-1c9dc285dd79']),
			} satisfies Mock)
		: undefined;

	return {
		providers: [
			...baseProviders,
			mock ? provideBackendApi(withMock(mock)) : provideBackendApi(),
		],
	} satisfies ApplicationConfig;
}
