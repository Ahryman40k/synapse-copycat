import {
	type ApplicationConfig,
	provideBrowserGlobalErrorListeners,
	// provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import {
	type Mock,
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
				],
				modules: [
					{
						kind: 'twinkly',
						name: 'Twinlky',
					},
				],
			} satisfies Mock)
		: undefined;

	return {
		providers: [
			...baseProviders,
			mock ? provideBackendApi(withMock(mock)) : provideBackendApi(),
		],
	} satisfies ApplicationConfig;
}
