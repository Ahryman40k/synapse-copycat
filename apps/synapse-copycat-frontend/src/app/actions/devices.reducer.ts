import { createFeatureSelector, createReducer, createSelector, on } from '@ngrx/store';
import { ConnectedDevice, UsbDevice } from '../models';
import * as DevicesActions from './devices.actions';


export interface DeviceState {
  usb: UsbDevice[];
  connected: ConnectedDevice[];
}

export interface AppState {
    devices: DeviceState
}

const initialState: DeviceState = {
  usb: [],
  connected: [],
};

export const devicesReducer = createReducer(
  initialState,
  on(DevicesActions.getUsbDevices, (state) => ({ ...state })),
  on(DevicesActions.UsbDevicesLoadedSuccess, (state, { device }) => ({
    ...state,
    usb: [...state.usb, device],
  })),
  on(DevicesActions.UsbDevicesLoadedFailure, (state) => ({
    ...state,
    usb: [],
  })),
  on(DevicesActions.getConnectedDevices, (state) => ({
    ...state,
  })),
  on(DevicesActions.ConnectedDevicesLoadedSuccess, (state, { device }) => ({
    ...state,
    connected: [...state.connected, device],
  })),
  on(DevicesActions.ConnectedDevicesLoadedFailure, (state) => ({
    ...state,
    usb: [],
  }))
);


export const selectDevices = ( state: AppState) => state.devices;

export const usbSelector = createSelector(
    selectDevices,
    devices => devices.usb
);


export const connectedSelector = createSelector(
    selectDevices,
    devices => devices.connected
  );
