import { ApplicationConfig, ErrorHandler } from "@angular/core";
import {
	provideRouter,
	withEnabledBlockingInitialNavigation,
} from "@angular/router";
import { appRoutes } from "./app.routes";
import { provideStore } from "@ngrx/store";
import { provideEffects } from "@ngrx/effects";
import { DeviceEffects } from "./actions/devices.effects";
import { devicesReducer } from "./actions";
import { provideHttpClient } from "@angular/common/http";
import { provideAnimations } from "@angular/platform-browser/animations";

import { environment } from "./environments/env";
import { DeviceService } from "./services/device-service-token";
import { TauriDeviceService } from "./services/tauri-device-service";
import { LocalDeviceService } from "./services/local-device.service";
import { ThemeService } from "./services/theme-manager";
import { GlobalErrorHandlerService } from "./services/global-error-handler";

export const appConfig: ApplicationConfig = {
	providers: [
		provideRouter(appRoutes, withEnabledBlockingInitialNavigation()),
		provideStore({ devices: devicesReducer }),
		// provideRouterStore(),
		// provideStoreDevtools(),
		provideEffects(DeviceEffects),
		provideHttpClient(),
		provideAnimations(),
		ThemeService,
		{ provide: ErrorHandler, useClass: GlobalErrorHandlerService },

		{
			provide: DeviceService,
			useClass:
				environment.__kind === "tauri"
					? TauriDeviceService
					: LocalDeviceService,
		},
	],
};
