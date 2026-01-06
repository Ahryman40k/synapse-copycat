import type { Device } from './device';
import type { Module } from './module';

export type BackendCommands = {
  devices: {
    args: Record<string, never>;
    options: Record<string, never>;
    returnType: {
      kind: Device['kind'];
      vendor_id: number;
      product_id: number;
      name: string;
    }[];
  };
  modules: {
    args: Record<string, never>;
    options: Record<string, never>;
    returnType: {
      kind: Module['kind'];
      name: string;
    }[];
  };
};
