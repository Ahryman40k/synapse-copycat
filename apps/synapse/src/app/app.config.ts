import {
	type ApplicationConfig,
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
import type { ApplicationConfig as Config } from './models/config';

export const baseProviders = [
	provideBrowserGlobalErrorListeners(),
	// provideZoneChangeDetection({ eventCoalescing: true }),
	provideRouter(appRoutes, withComponentInputBinding()),
];

export function makeAppConfig(config: Config) {
	const isTauri = (): boolean => !!(window as any).__TAURI_INTERNALS__;
	const isTauriDetected = isTauri();

	console.log('Tauri detected', isTauriDetected);
	console.log('Use configuration', config);
	const mock = !isTauriDetected
		? ({
				devices: [
					{
						kind: 'mouse',
						name: 'Razer Basilisk Ultimate',
						vendor_id: 5426,
						product_id: 136,
					},
					// A second mouse, of a different model, so the browser path actually
					// exercises two devices sharing a kind. They are told apart by
					// vendor_id/product_id; two units of the SAME model would not be —
					// that needs the serial, which the wire shape drops.
					{
						kind: 'mouse',
						name: 'Razer Viper V2 Pro',
						vendor_id: 5426,
						product_id: 165,
					},
					{
						kind: 'mousemat',
						name: 'Goliatus Extended',
						vendor_id: 5426,
						product_id: 3074,
					},
					{
						kind: 'keyboard',
						name: 'Razer Huntsman Elite',
						vendor_id: 5426,
						product_id: 550,
					},
					// The Kiyo is a webcam, and `camera` is not one of the kinds the
					// contract carries. `streaming` is Razer's own name for that line
					// and is already what the (commented-out) route is called.
					{
						kind: 'streaming',
						name: 'Razer Kiyo',
						vendor_id: 5426,
						product_id: 3587,
					},
				],
				modules: [
					{
						kind: 'twinkly',
						name: 'Twinlky',
					},
				],

				// The group commands change things, so they cannot be a table of
				// fixed answers — `mockGroups` keeps the state, and the one rule
				// worth keeping: a participant belongs to at most one group.
				//
				// The ids match what the store builds from the wire shape,
				// `<vendor>-<product>` zero-padded, so a group formed here names
				// the same devices the dashboard shows.
				...mockGroups([
					'5426-0136',
					'5426-0165',
					'5426-3074',
					'5426-0550',
					'5426-3587',
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
