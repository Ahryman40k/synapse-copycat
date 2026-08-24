import { inject } from '@angular/core';
import type { ResolveFn, Route } from '@angular/router';
import type { Device, GroupStatus, Module } from '@synapse-copycat/backend-api';
import { ApplicationStore } from './core/stores/application-store';
import { DashboardPage } from './domains/dashboard-page/dashboard-page';

export const devicesResolver: ResolveFn<Device[]> = () => {
	const store = inject(ApplicationStore);
	store.getDevices();
	return store.devices();
};

/**
 * Sweep the network for participants that are not Razer devices.
 *
 * ⚠️ Seconds, not milliseconds. Like the others this returns what the store
 * already holds and lets the answer land afterwards, so the dashboard paints
 * immediately and the strips appear when they are found.
 */
export const discoveredResolver: ResolveFn<Device[]> = () => {
	const store = inject(ApplicationStore);
	store.getDiscovered();
	return store.discovered();
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
			discovered: discoveredResolver,
		},
	},
	// The paths are the ones `core/models/place.ts` names. Both are declared
	// there and here, which is one duplication too many — the table is what the
	// bar and the address reader agree on, and a mismatch shows up as an entry
	// that highlights nothing.
	//
	// ⚠️ Loaded on demand, and worth little on its own: the dashboard is the
	// initial route, so what these three save is only the code nothing else
	// already needs — and the studio's ambience panel is shared with a group
	// card, so it stays in the first bundle either way. The weight was never
	// here. It was the five device pages behind the detail dialog, which
	// `device-dialog.ts` now imports rather than references.
	{
		path: 'studio',
		loadComponent: () =>
			import('./domains/studio-page/studio-page').then((m) => m.StudioPage),
	},
	{
		path: 'backgrounds',
		loadComponent: () =>
			import('./domains/backgrounds-page/backgrounds-page').then(
				(m) => m.BackgroundsPage,
			),
	},
	{
		path: 'settings',
		loadComponent: () =>
			import('./domains/settings-page/settings-page').then(
				(m) => m.SettingsPage,
			),
	},
];
