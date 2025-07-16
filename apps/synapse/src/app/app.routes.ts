import type { Route } from '@angular/router';
import { DashboardPage } from './domains/dashboard-page';
import { ApplicationStore } from './core/stores/application-store';

export const appRoutes: Route[] = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full',  },
  { path: 'dashboard', component: DashboardPage },
  // {
  //   path: 'device',
  //   children: [
  //     {
  //       path: 'mousemat',
  //       component: MousematPageComponent,
  //     },
  //     {
  //       path: 'mouse',
  //       component: MousePageComponent,
  //     },
  //     {
  //       path: 'keyboard',
  //       component: KeyboardPageComponent,
  //     },
  //     {
  //       path: 'accessory',
  //       component: AccessoryPageComponent,
  //     },
  //     {
  //       path: 'streaming',
  //       component: StreamingPageComponent,
  //     },
  //   ],
  // },
];
