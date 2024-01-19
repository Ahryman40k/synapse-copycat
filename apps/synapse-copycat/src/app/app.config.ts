import { ApplicationConfig } from '@angular/core';
import {
  provideRouter,
  withEnabledBlockingInitialNavigation,
} from '@angular/router';
import { appRoutes } from './app.routes';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { DeviceEffects } from './actions/devices.effects';
import { devicesReducer } from './actions';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(appRoutes, withEnabledBlockingInitialNavigation()),
    provideStore({ devices: devicesReducer }),
    // provideRouterStore(),
    // provideStoreDevtools(),
    provideEffects(DeviceEffects),
    provideHttpClient(),
    provideAnimations(),
  ],
};
