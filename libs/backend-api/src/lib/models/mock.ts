import type { BackendCommands } from './backend-commands';

/**
 * The browser-mode stand-in for the Rust backend.
 *
 * Derived from `BackendCommands`, which is the point: add a command and
 * TypeScript names every mock that no longer answers it. See root AGENTS.md §7
 * — the browser path is the primary development mode, so a feature that only
 * works in Tauri is not a feature yet.
 *
 * An entry is either a fixed answer or **a function of the arguments**. Fixed
 * was enough while every command only read; the group commands create, rename
 * and start things, and a table of constants cannot express "create one, then
 * list it". The function form lets a mock hold state — see `mockGroups`.
 */
export type Mock = {
	[K in keyof BackendCommands]:
		| BackendCommands[K]['returnType']
		| ((
				args: BackendCommands[K]['args'],
		  ) =>
				| BackendCommands[K]['returnType']
				| Promise<BackendCommands[K]['returnType']>);
};
