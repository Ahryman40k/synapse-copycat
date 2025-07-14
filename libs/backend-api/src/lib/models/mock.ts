import type { BackendCommands } from './backend-commands';

export type Mock = {
	[K in keyof BackendCommands]: BackendCommands[K]['returnType'];
};
