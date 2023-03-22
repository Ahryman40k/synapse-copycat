import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, EffectSources, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, exhaustMap, map, of, shareReplay, switchMap } from 'rxjs';
import { UsbDevice } from '../models';
import { ConnectedDevicesService } from '../services/connected-devices.service';
import { UsbDevicesService } from '../services/usb-devices.service';
import * as DevicesActions from './devices.actions';

@Injectable()
export class DeviceEffects {
  private readonly action$ = inject(Actions);
  // private readonly store = inject(Store);
  private readonly usbService = inject(UsbDevicesService);
  private readonly connectedService = inject(ConnectedDevicesService);

  readonly loadUsbDevices$ = createEffect(() =>
    this.action$.pipe(
      ofType(DevicesActions.getUsbDevices),
      switchMap( () => this.usbService.discover().pipe(
        map( device => DevicesActions.UsbDevicesLoadedSuccess( {device} ) ),
        catchError( error => of(DevicesActions.UsbDevicesLoadedFailure( {error} )) ),
      ))
    )
  );


  readonly loadConnectedDevices$ = createEffect(() =>
  this.action$.pipe(
    ofType(DevicesActions.getConnectedDevices),
    switchMap( () => this.connectedService.discover().pipe(
      map( device => DevicesActions.ConnectedDevicesLoadedSuccess( {device} ) ),
      catchError( error => of(DevicesActions.UsbDevicesLoadedFailure( {error} )) ),
    ))
  )
);
}
