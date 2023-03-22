import { Injectable } from '@angular/core';
import { delay, from, Observable, take } from 'rxjs';
import { ConnectedDevice } from '../models';

function *discoveringConnected(): IterableIterator<ConnectedDevice> {
  yield { kind: 'twinkly', name: 'Twinkly', visual: './assets/images/razer-logo.svg' } ;
  yield { kind: 'goove', name: 'Govee', visual: './assets/images/razer-logo.svg' } ;
  yield { kind: 'nanoleaf', name: 'Nanoleaf', visual: './assets/images/razer-logo.svg' } ;
  
}



@Injectable({
  providedIn: 'root'
})
export class ConnectedDevicesService {

  constructor() { }


  discover() : Observable<ConnectedDevice> {
    return from(discoveringConnected()).pipe(
      take(3)
    )
  }


}
