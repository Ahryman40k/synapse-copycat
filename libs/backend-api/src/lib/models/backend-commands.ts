import type { Device } from "./device";
import type { Module } from "./module";

export type BackendCommands = {
	devices: {
		args: Record<string, never>;
		options: Record<string, never>;
		returnType: Device[];
	};
	modules: {
		args: Record<string, never>;
		options: Record<string, never>;
		returnType: Module[];
	};
};
