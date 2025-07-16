import { inject } from '@angular/core'
import { patchState, signalStore, withMethods, withState} from '@ngrx/signals'
import { BackendApi, Device, Module } from '@synapse-copycat/backend-api'

export type ApplicationState = {
  devices: Device[],
  modules: Module[]
};

export const ApplicationStore = signalStore(
  { providedIn: 'root'},

  withState<ApplicationState>({
    devices: [],
    modules:[]
  }),

  withMethods((store, backendApi = inject(BackendApi)) => ({
    async getDevices(): Promise<void> {
      const devices = await backendApi.invoke('devices', {});
      patchState(store, {devices })
    },
    async getModules(): Promise<void> {
      const modules = await backendApi.invoke('modules', {});
      patchState(store, {modules})
    }

  }))
)
