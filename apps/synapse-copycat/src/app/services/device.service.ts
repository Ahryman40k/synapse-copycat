import { inject, Injectable } from '@angular/core';
import {
  delay,
  from,
  map,
  merge,
  Observable,
  of,
  shareReplay,
  withLatestFrom,
} from 'rxjs';
import { Device, DeviceRepository } from '../models';

import { invoke } from '@tauri-apps/api';
import { HttpClient } from '@angular/common/http';

/*
const t = {
  '123': {
    a: {
      a1: 1,
      a2: 2,
    },
  },
  '456': {
    b: {
      b1: 2,
      b2: 3,
    },
  },
};


type T1A = keyof (typeof t)['123']['a'];
type T1B = keyof (typeof t)['456']['b'];
*/

type ExtractGroupKeys<T> = keyof T;
type ExtractIdKeys<
  T extends Record<string, unknown>,
  G extends string
> = T[G] extends Record<string, unknown> ? keyof T[G] : never;

// type T1 = ExtractGroupKeys<typeof t>;
// type T2 = ExtractIdKeys<typeof t, ExtractGroupKeys<typeof t>>;

export const extractUsbDevice = <
  T extends Record<string, Record<string, Partial<Device>>>,
  G extends string & ExtractGroupKeys<T>,
  D extends string & ExtractIdKeys<T, G>
>(
  devices: T,
  deviceGroup: keyof T,
  deviceId: D
): Device => {
  const groupExists = !!devices[deviceGroup];
  if (!groupExists) {
    throw new Error(`Unkown device group ${String(deviceGroup)}`);
  }
  const deviceIdExists = !!devices[deviceGroup][deviceId];
  if (!deviceIdExists) {
    throw new Error(
      `Unknown device id ${String(deviceId)} in device group ${String(
        deviceGroup
      )}`
    );
  }

  const device = devices[deviceGroup][deviceId];
  return {
    __type: 'device',
    group: 'usb',

    id: deviceId,

    name: device.name,
    kind: device.kind,
    visual: device.visual,
  } as Device;
};

@Injectable({
  providedIn: 'root',
})
export class DeviceService {
  private readonly _http = inject(HttpClient);

  private readonly _deviceRepository = this._http
    .get<DeviceRepository>('assets/usb-devices.json')
    .pipe(shareReplay());

  private discoverUsb$: Observable<Device[]> = from(
    invoke<{ vendor_id: number; product_id: number }[]>('devices', {})
  ).pipe(
    withLatestFrom(this._deviceRepository),
    map(([devices, repository]) =>
      devices.map((device) =>
        extractUsbDevice(
          repository,
          device.vendor_id.toString() || '0',
          device.product_id.toString() || '0'
        )
      )
    )
  );

  private discoverConnected$: Observable<Device[]> = of([
    {
      __type: 'device',
      group: 'connected',
      kind: 'twinkly',
      name: 'Twinkly',
      visual: 'assets/devices/twinkly.png',
    },
    {
      __type: 'device',
      group: 'connected',
      kind: 'goove',
      name: 'Govee',
      visual: 'assets/images/razer-logo.svg',
    },
    {
      __type: 'device',
      group: 'connected',
      kind: 'nanoleaf',
      name: 'Nanoleaf',
      visual: 'assets/images/razer-logo.svg',
    },
  ]);

  discover = (): Observable<Device[]> =>
    merge(this.discoverUsb$, this.discoverConnected$).pipe(delay(1000));
}
