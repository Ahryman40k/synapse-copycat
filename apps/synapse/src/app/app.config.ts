import {
	type ApplicationConfig,
	provideBrowserGlobalErrorListeners,
	provideZoneChangeDetection,
} from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideBackendApi, withMock, Mock } from "@synapse-copycat/backend-api";
import { appRoutes } from "./app.routes";
import type { ApplicationConfig as Config } from "./models/config";

export const baseProviders = [
	provideBrowserGlobalErrorListeners(),
	provideZoneChangeDetection({ eventCoalescing: true }),
	provideRouter(appRoutes),
];

export function makeAppConfig(config: Config) {
	const mock =
		config.envType === "local"
			? {
					devices: [
						{
							__type: "device",
							kind: "mouse",
							name: "Razer Basilisk Ultimate",
							id: "5426-0136",
							visual: "asssets/devices/5436-0136.png",
						},
						{
							__type: "device",
							kind: "mousemat",
							name: "Goliatus Extended",
							id: "5626-3074",
							visual: "assets/devices/5436-3074.png",
						},
					],
					modules: [
						{
							__type: "module",
							kind: "twinkly",
							name: "Twinlky",
							visual: "asssets/modules/twinkly.png",
						},
					],
				} satisfies Mock
			: undefined;

	return {
		providers: [...baseProviders, mock ? provideBackendApi(  withMock(mock) ) : provideBackendApi() ],
	} satisfies ApplicationConfig;
}
