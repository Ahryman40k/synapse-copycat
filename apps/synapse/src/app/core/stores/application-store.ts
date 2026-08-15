import { computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import {
	patchState,
	signalStore,
	withComputed,
	withMethods,
	withState,
} from '@ngrx/signals';
import {
	BackendApi,
	type Device,
	type Module,
} from '@synapse-copycat/backend-api';
import { EMPTY, filter, map, type Observable } from 'rxjs';

export type ApplicationState = {
	devices: Device[];
	modules: Module[];
};

/**
 * `/device/mouse/5426-0136` → `5426-0136`; anything else → undefined.
 *
 * Exported so it can be tested for what it is — string handling — without a
 * store, a router or a backend.
 */
export function deviceIdFromUrl(url: string): string | undefined {
	const segments = url.split('?')[0].split('/').filter(Boolean);
	return segments[0] === 'device' ? segments.at(2) : undefined;
}

/** The URL after every completed navigation, or nothing without a router. */
function routeChanges(router: Router | null): Observable<string> {
	if (!router) return EMPTY;

	return router.events.pipe(
		filter((event) => event instanceof NavigationEnd),
		map(() => router.url),
	);
}

export const ApplicationStore = signalStore(
	{ providedIn: 'root' },

	withState<ApplicationState>({
		devices: [],
		modules: [],
	}),

	/**
	 * Which device the user is looking at, selected from the ones already held.
	 *
	 * It belongs here rather than in a service of its own: a page section is
	 * rendered by `ngComponentOutlet`, which passes no inputs, so nothing
	 * inside a tab can be handed the device from above — and every one of them
	 * already injects this store. Carrying the inputs on the page-bar
	 * descriptor was the other candidate and cannot work: the bar holds the
	 * selected tab by identity, so rebuilding that array on each device change
	 * would drop the selection.
	 *
	 * Deriving it from the URL rather than remembering the last device opened
	 * keeps it right after a back/forward, or on an address opened directly.
	 * `@ngrx/router-store` puts routing state in the store for the same reason.
	 *
	 * The router is optional so a component reading these can still be rendered
	 * without one — a story or a spec, where the URL means nothing.
	 */
	withComputed((store, router = inject(Router, { optional: true })) => {
		const url = toSignal(routeChanges(router), {
			initialValue: router?.url ?? '',
		});
		const currentDeviceId = computed(() => deviceIdFromUrl(url()));

		return {
			currentDeviceId,
			/**
			 * ⚠️ Undefined on an address opened directly, because only the
			 * dashboard route resolves the devices into the store. The same gap
			 * already leaves the application bar without entries in that case.
			 */
			currentDevice: computed(() =>
				store.devices().find((device) => device.id === currentDeviceId()),
			),
		};
	}),

	withMethods((store, backendApi = inject(BackendApi)) => ({
		async getDevices(): Promise<Device[]> {
			const result = await backendApi.invoke('devices', {});

			const devices = result.map((r) => {
				const vendorId = r.vendor_id.toString().padStart(4, '0');
				const productId = r.product_id.toString().padStart(4, '0');

				return {
					__type: 'device',
					kind: r.kind,
					id: `${vendorId}-${productId}`,
					name: r.name,
					visual: `assets/devices/${vendorId}-${productId}.png`,
				} satisfies Device;
			}); // TODO: write wrapper here + validator

			patchState(store, { devices });
			return devices;
		},
		async getModules(): Promise<Module[]> {
			const result = await backendApi.invoke('modules', {});

			// TODO: add wrapper and validator
			const modules = result.map(
				(r) =>
					({
						__type: 'module',
						name: r.name,
						kind: r.kind,
						visual: `assets/modules/${r.kind}.png`,
					}) satisfies Module,
			);
			patchState(store, { modules });
			return modules;
		},
	})),
);
export type ApplicationStore = InstanceType<typeof ApplicationStore>;
