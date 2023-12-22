import { Injectable } from '@angular/core';
import { combineLatest, delay, from, Observable, take } from 'rxjs';
import { Device } from '../models';

function* discoveringUsb(): IterableIterator<Device> {
  yield {
    __type: 'device',
    group: 'usb',
    kind: 'keyboard',
    name: 'Razer Huntsman Elite',
    visual: 'assets/images/razer-logo.svg',
    id: '3205',
  };
  yield {
    __type: 'device',
    group: 'usb',
    kind: 'camera',
    name: 'Razer Kiyo',
    visual: 'assets/images/razer-kiyo.png',
    id: '3206',
  };
  yield {
    __type: 'device',
    group: 'usb',
    kind: 'mousemat',
    name: 'Razer Goliathus extended Chroma',
    visual: 'assets/images/razer-logo.svg',
    id: '3207',
  };
  yield {
    __type: 'device',
    group: 'usb',
    kind: 'mouse',
    name: 'Razer Basilisk Ultimate',
    visual: 'assets/images/razer-basilisk-ultimate.png',
    id: '3208',
  };
}

function* discoveringConnected(): IterableIterator<Device> {
  yield {
    __type: 'device',
    group: 'connected',
    kind: 'twinkly',
    name: 'Twinkly',
    visual: 'assets/images/twinkly.png',
  };
  yield {
    __type: 'device',
    group: 'connected',
    kind: 'goove',
    name: 'Govee',
    visual: 'assets/images/razer-logo.svg',
  };
  yield {
    __type: 'device',
    group: 'connected',
    kind: 'nanoleaf',
    name: 'Nanoleaf',
    visual: 'assets/images/razer-logo.svg',
  };
}
@Injectable({
  providedIn: 'root',
})
export class DeviceService {
  discover(): Observable<Device[]> {
    return combineLatest([
      from(discoveringUsb()),
      from(discoveringConnected()),
    ]).pipe(delay(10000), take(4));
  }
}
