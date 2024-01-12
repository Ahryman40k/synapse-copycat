import { z } from 'zod';

export function isValidZodLiteralUnion<T extends z.ZodLiteral<unknown>>(
  literals: T[]
): literals is [T, T, ...T[]] {
  return literals.length >= 2;
}

export function constructZodLiteralUnionType<T extends z.ZodLiteral<unknown>>(
  literals: T[]
) {
  if (!isValidZodLiteralUnion(literals)) {
    throw new Error(
      'Literals passed do not meet the criteria for constructing a union schema, the minimum length is 2'
    );
  }

  return z.union(literals);
}

export const connectedDevices = ['twinkly', 'goove', 'nanoleaf'] as const;
export const ConnectedDevicesSchema = constructZodLiteralUnionType(
  connectedDevices.map((d) => z.literal(d))
);
export type ConnectedDevice = z.infer<typeof ConnectedDevicesSchema>;

export const usbDevices = [
  'keyboard',
  'streaming',
  'mouse',
  'mousemat',
  'headset',
  'accessory'
] as const;
export const UsbDeviceSchema = constructZodLiteralUnionType(
  usbDevices.map((d) => z.literal(d))
);

export type UsbDevice = z.infer<typeof UsbDeviceSchema>;

export const deviceGroup = ['usb', 'connected'] as const;
export const DeviceGroup = constructZodLiteralUnionType(
  deviceGroup.map((g) => z.literal(g))
);
export type DeviceGroup = z.infer<typeof DeviceGroup>;

export const Device = z
  .object({
    __type: z.literal('device'),
    name: z.string(),
    visual: z.string(),
  })
  .and(
    z.discriminatedUnion('group', [
      z.object({
        group: z.literal('usb'),
        kind: UsbDeviceSchema,
        id: z.string(),
      }),
      z.object({
        group: z.literal('connected'),
        kind: ConnectedDevicesSchema,
      }),
    ])
  );

export type Device = z.infer<typeof Device>;
