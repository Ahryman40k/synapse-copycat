export type SupportedDeviceKind = 'keyboard' | 'camera' | 'mouse' | 'mousemat'

export type UsbDevice = {
    kind: SupportedDeviceKind;
    name: string;
    visual: string;
}

