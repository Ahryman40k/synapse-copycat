import { createAction, props } from "@ngrx/store";
import { ConnectedDevice, UsbDevice } from "../models";

export const getUsbDevices = createAction(
    '[USB] Get devices'
)

export const UsbDevicesLoadedSuccess = createAction(
    '[USB] Devices loaded successfully',
    props<{ device: UsbDevice }>()
)

export const UsbDevicesLoadedFailure = createAction(
    '[USB] Devices failed to load',
    props<{ error: Error }>()
)


export const getConnectedDevices = createAction(
    '[Connected] Get devices'
)


export const ConnectedDevicesLoadedSuccess = createAction(
    '[Connected] Devices loaded successfully',
    props<{ device: ConnectedDevice }>()
)

export const ConnectedDevicesLoadedFailure = createAction(
    '[Connected] Devices failed to load',
    props<{ error: Error }>()
)
