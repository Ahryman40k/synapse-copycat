import { bootstrapApplication } from '@angular/platform-browser';
import {
  provideRouter,
  withEnabledBlockingInitialNavigation,
} from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';
import { DeviceEffects } from './app/actions/devices.effects';
import { devicesReducer } from './app/actions/devices.reducer';
import { AppComponent } from './app/app.component';
import { appRoutes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(appRoutes, withEnabledBlockingInitialNavigation()),
    provideStore({ devices: devicesReducer }),
    // provideRouterStore(),
    // provideStoreDevtools(),
    provideEffects([DeviceEffects, ])
  ],
}).catch((err) => console.error(err));
