import { z } from 'zod';
import { UsbDeviceSchema } from './devices';

const UsbDeviceRepositorySchema = z.object({
  name: z.string(),
  visual: z.string(),
  kind: UsbDeviceSchema,
  id: z.string(),
});

export const DeviceRepository = z.record(z.record(UsbDeviceRepositorySchema));
export type DeviceRepository = z.infer<typeof DeviceRepository>;
