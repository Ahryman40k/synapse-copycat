import { inject } from '@angular/core';
import type { ResolveFn, Route } from '@angular/router';
import type { Device, GroupStatus, Module } from '@synapse-copycat/backend-api';
import { ApplicationStore } from './core/stores/application-store';
import { DashboardPage } from './domains/dashboard-page/dashboard-page';
import { BackgroundsPage } from './domains/backgrounds-page/backgrounds-page';
import { SettingsPage } from './domains/settings-page/settings-page';
import { StudioPage } from './domains/studio-page/studio-page';

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
	{
		path: 'studio',
		component: StudioPage,
	},
	{
		path: 'backgrounds',
		component: BackgroundsPage,
	},
	{
		path: 'settings',
		component: SettingsPage,
	},
];
