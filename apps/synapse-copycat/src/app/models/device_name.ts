export const deviceNames = [
  'MouseBasiliskV3',
  'MouseViperV2Pro',
  'MouseRazerCobraPro',
  'CameraKyo',
  'KeyboardBlackWidow',
  'KeyboardHuntsmanV3Pro',
] as const;

export type DeviceName = (typeof deviceNames)[number];
