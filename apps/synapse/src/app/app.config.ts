import {
	ApplicationConfig,
	provideBrowserGlobalErrorListeners,
	provideZoneChangeDetection,
} from "@angular/core";
import { provideRouter } from "@angular/router";
import { appRoutes } from "./app.routes";
import { ApplicationConfig as Config } from "./models/config";
import { provideBackendApi, withMock } from "@synapse-copycat/backend-api";

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
				}
			: undefined;

	return {
		providers: [...baseProviders, provideBackendApi(withMock(mock))],
	} satisfies ApplicationConfig;
}
