import type { ResolveFn, Route } from '@angular/router';
import { DashboardPage } from './domains/dashboard-page/dashboard-page';
import { ApplicationStore } from './core/stores/application-store';
import { inject } from '@angular/core';
import type { Device, Module } from '@synapse-copycat/backend-api';
import { MousePageComponent } from './domains/devices/mouse-page/mouse-page';
import { MousematPageComponent } from './domains/devices/mousemat-page/mousemat-page';

export const devicesResolver: ResolveFn<Device[]> = () => {
  const store = inject(ApplicationStore);
  store.getDevices();
  return store.devices();
};

export const modulesResolver: ResolveFn<Module[]> = () => {
  const store = inject(ApplicationStore);
  store.getModules();
  return store.modules();
};

export const appRoutes: Route[] = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    component: DashboardPage,
    resolve: {
      devices: devicesResolver,
      modules: modulesResolver,
    },
  },
  {
    path: 'device',
    children: [
      {
        path: 'mousemat',
        component: MousematPageComponent,
      },
      {
        path: 'mouse',
        component: MousePageComponent,
      },
      // {
      //   path: 'keyboard',
      //   component: KeyboardPageComponent,
      // },
      // {
      //   path: 'accessory',
      //   component: AccessoryPageComponent,
      // },
      // {
      //   path: 'streaming',
      //   component: StreamingPageComponent,
      // },
    ],
  },
];
