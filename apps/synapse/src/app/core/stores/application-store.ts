import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import {
	BackendApi,
	type Device,
	type Module,
} from '@synapse-copycat/backend-api';

export type ApplicationState = {
	devices: Device[];
	modules: Module[];
};

export const ApplicationStore = signalStore(
	{ providedIn: 'root' },

	withState<ApplicationState>({
		devices: [],
		modules: [],
	}),

	withMethods((store, backendApi = inject(BackendApi)) => ({
		/**
		 * The selector a device page uses to turn its `:id` route segment into
		 * the device it is about.
		 *
		 * Called inside a `computed` it stays reactive — it reads `devices`, so
		 * the page follows the store filling up. The page then hands the result
		 * down to its sections instead of each deriving its own: one answer per
		 * page, and they cannot disagree.
		 */
		deviceById(id: string | undefined): Device | undefined {
			return store.devices().find((device) => device.id === id);
		},

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
