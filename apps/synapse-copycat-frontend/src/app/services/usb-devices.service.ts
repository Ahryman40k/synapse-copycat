import { Injectable } from '@angular/core';
import { delay, from, interval, Observable, of, switchMap, switchMapTo, take } from 'rxjs';
import { UsbDevice } from '../models';


function *discoveringUsb(): IterableIterator<UsbDevice> {
  yield { kind: 'keyboard', name: 'Razer Huntsman Elite', visual: './assets/images/razer-logo.svg' } ;
  yield { kind: 'camera', name: 'Razer Kiyo', visual: './assets/images/razer-logo.svg' } ;
  yield { kind: 'mousemat', name: 'Razer Goliathus extended Chroma', visual: './assets/images/razer-logo.svg' } ;
  yield { kind: 'mouse', name: 'Razer Basilisk Ultimate', visual: './assets/images/razer-logo.svg' } ;
}


@Injectable({
  providedIn: 'root'
})
export class UsbDevicesService {

  constructor() { }

  discover() : Observable<UsbDevice> {
    return from(discoveringUsb()).pipe(
      delay(10000),
      take(4)
    )
  }

}
