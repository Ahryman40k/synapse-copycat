import { inject } from '@angular/core';
import type { ResolveFn, Route } from '@angular/router';
import type { Device, GroupStatus, Module } from '@synapse-copycat/backend-api';
import { ApplicationStore } from './core/stores/application-store';
import { DashboardPage } from './domains/dashboard-page/dashboard-page';
import { CameraPageComponent } from './domains/devices/camera-page/camera-page';
import { KeyboardPageComponent } from './domains/devices/keyboard-page/keyboard-page';
import { MousePageComponent } from './domains/devices/mouse-page/mouse-page';
import { MousematPageComponent } from './domains/devices/mousemat-page/mousemat-page';
import { SettingsPage } from './domains/settings-page/settings-page';

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

/**
 * The groups, which the dashboard is now about.
 *
 * Like the two above it, this returns what the store already holds and lets
 * the fetch land afterwards — the page renders from signals, so waiting on the
 * backend would only delay first paint.
 */
export const groupsResolver: ResolveFn<GroupStatus[]> = () => {
	const store = inject(ApplicationStore);
	store.getGroups();
	return store.groups();
};

export const appRoutes: Route[] = [
	{ path: '', redirectTo: 'dashboard', pathMatch: 'full' },
	{
		path: 'dashboard',
		component: DashboardPage,
		resolve: {
			devices: devicesResolver,
			modules: modulesResolver,
			groups: groupsResolver,
		},
	},
	{
		path: 'settings',
		component: SettingsPage,
	},
	{
		path: 'device',
		children: [
			// The id segment is what lets two different mouse models each have
			// their own page; the kind still selects which component renders.
			{
				path: 'mousemat/:id',
				component: MousematPageComponent,
			},
			{
				path: 'mouse/:id',
				component: MousePageComponent,
			},
			{
				path: 'keyboard/:id',
				component: KeyboardPageComponent,
			},
			// {
			//   path: 'accessory',
			//   component: AccessoryPageComponent,
			// },
			// `streaming` is the kind the contract carries for the Kiyo; there is
			// no `camera` one.
			{
				path: 'streaming/:id',
				component: CameraPageComponent,
			},
		],
	},
];
