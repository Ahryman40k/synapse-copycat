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
