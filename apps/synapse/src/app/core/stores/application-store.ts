import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { BackendApi, Device, Module } from '@synapse-copycat/backend-api';

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
    async getDevices(): Promise<void> {
      const result = await backendApi.invoke('devices', {});

      const devices = result.map(
        (r) =>
          ({
            __type: 'device',
            kind: r.kind,
            id: `${r.vendor_id}-${r.product_id}`,
            name: r.name,
            visual: `assets/devices/${r.vendor_id}-${r.product_id}.png`,
          } satisfies Device)
      ); // TODO: write wrapper here + validator

      patchState(store, { devices });
    },
    async getModules(): Promise<void> {
      const result = await backendApi.invoke('modules', {});

      const modules = result.map(
        (r) =>
          ({
            __type: 'module',
            name: r.name,
            kind: r.kind,
            visual: `assets/modules/${r.kind}.png`,
          } satisfies Module)
      );
      patchState(store, { modules });
    },
  }))
);
