import { Injectable, inject } from '@angular/core';
import { DeviceService } from '../services/device.service';

import * as DeviceActions from './devices.actions';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of, switchMap, catchError, map, tap, exhaustMap } from 'rxjs';

@Injectable()
export class DeviceEffects {
  private readonly action$ = inject(Actions);
  private readonly deviceService = inject(DeviceService);

  readonly loadDevices$ = createEffect(() =>
    this.action$.pipe(
      ofType(DeviceActions.getDevices),
      exhaustMap(() =>
        this.deviceService.discover().pipe(
          map((devices) => DeviceActions.DevicesLoadedSuccess({ devices })),
          catchError((error) =>
            of(DeviceActions.DevicesLoadedFailure({ error }))
          )
        )
      )
    ),
    // { functional: true, dispatch: false }

  );
}
