import { inject, Injectable } from '@angular/core';
import { from, map, Observable, shareReplay, tap, withLatestFrom } from 'rxjs';
import { Device, DeviceRepository } from '../models';

import { invoke } from '@tauri-apps/api';
import { HttpClient } from '@angular/common/http';

// function* discoveringUsb(): IterableIterator<Device> {
//   yield {
//     __type: 'device',
//     group: 'usb',
//     kind: 'keyboard',
//     name: 'Razer Huntsman Elite',
//     visual: 'assets/images/razer-logo.svg',
//     id: '3205',
//   };
//   yield {
//     __type: 'device',
//     group: 'usb',
//     kind: 'camera',
//     name: 'Razer Kiyo',
//     visual: 'assets/images/razer-kiyo.png',
//     id: '3206',
//   };
//   yield {
//     __type: 'device',
//     group: 'usb',
//     kind: 'mousemat',
//     name: 'Razer Goliathus extended Chroma',
//     visual: 'assets/images/razer-logo.svg',
//     id: '3207',
//   };
//   yield {
//     __type: 'device',
//     group: 'usb',
//     kind: 'mouse',
//     name: 'Razer Basilisk Ultimate',
//     visual: 'assets/images/razer-basilisk-ultimate.png',
//     id: '3208',
//   };
// }

// function* discoveringConnected(): IterableIterator<Device> {
//   yield {
//     __type: 'device',
//     group: 'connected',
//     kind: 'twinkly',
//     name: 'Twinkly',
//     visual: 'assets/images/twinkly.png',
//   };
//   yield {
//     __type: 'device',
//     group: 'connected',
//     kind: 'goove',
//     name: 'Govee',
//     visual: 'assets/images/razer-logo.svg',
//   };
//   yield {
//     __type: 'device',
//     group: 'connected',
//     kind: 'nanoleaf',
//     name: 'Nanoleaf',
//     visual: 'assets/images/razer-logo.svg',
//   };
// }

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
  T extends Record<string, any>,
  G extends string
> = keyof T[G];

// type T1 = ExtractGroupKeys<typeof t>;
// type T2 = ExtractIdKeys<typeof t, ExtractGroupKeys<typeof t>>;

export const extractUsbDevice = <
  T extends Record<string, any>,
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
  const deviceIdExists = groupExists && !!devices[deviceGroup][deviceId];
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

  discover(): Observable<Device[]> {
    return from(
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

    /*
    return combineLatest([
      from(discoveringUsb()),
      from(discoveringConnected()),
    ]).pipe(delay(10000), take(4));
  }*/
  }
}
