import { createReducer, createSelector, on } from '@ngrx/store';
import { Device } from '../models';
import * as DevicesActions from './devices.actions';

export interface DeviceState {
  usb: Device[];
  connected: Device[];
}

export interface AppState {
  devices: DeviceState;
}

const initialState: DeviceState = {
  usb: [],
  connected: [],
};

export const devicesReducer = createReducer(
  initialState,
  on(DevicesActions.getDevices, (state) => ({ ...state })),
  on(DevicesActions.DevicesLoadedSuccess, (state, { devices }) => ({
    ...state,
    usb: [...state.usb, ...devices.filter((d) => d.group === 'usb')],
    connected: [
      ...state.connected,
      ...devices.filter((d) => d.group === 'connected'),
    ],
  })),
  on(DevicesActions.DevicesLoadedFailure, (state) => ({
    ...state,
    usb: [],
    connected: [],
  }))
);

export const selectDevices = (state: AppState) => state.devices;

export const usbSelector = createSelector(
  selectDevices,
  (devices) => devices.usb
);

export const connectedSelector = createSelector(
  selectDevices,
  (devices) => devices.connected
);