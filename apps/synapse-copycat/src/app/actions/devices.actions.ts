import { createAction, props } from '@ngrx/store';
import { Device } from '../models';

export const getDevices = createAction('Get devices');

export const DevicesLoadedSuccess = createAction(
  'Devices loaded successfully',
  props<{ devices: Device[] }>()
);

export const DevicesLoadedFailure = createAction(
  'Devices failed to load',
  props<{ error: Error }>()
);
