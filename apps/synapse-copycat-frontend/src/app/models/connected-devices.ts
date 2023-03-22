
export type SupportedConnectedDeviceKind = 'twinkly' | 'goove' | 'nanoleaf' ;

export type ConnectedDevice = {
    kind: SupportedConnectedDeviceKind;
    name: string;
    visual: string;
}

