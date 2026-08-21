import {
	type InvokeOptions,
	invoke as tauriInvoke,
} from '@tauri-apps/api/core';
import type { BackendCommands, Mock } from '../models';

export class BackendApiService {
	constructor(private readonly mock: Mock | undefined) {}

	/**
	 * Calls a backend command, or its mock in browser mode.
	 *
	 * The return type is read from the command rather than taken as a type
	 * parameter. It used to be `R extends BackendCommands[C]['returnType']`,
	 * which no caller ever instantiated more narrowly and which forced a cast
	 * the compiler could not check — `R` might be any subtype, so nothing
	 * proves the mock's answer is one. Reading it straight from `C` removes
	 * both the parameter and the cast.
	 */
	async invoke<C extends keyof BackendCommands>(
		cmd: C,
		args: BackendCommands[C]['args'],
		options?: BackendCommands[C]['options'] & InvokeOptions,
	): Promise<BackendCommands[C]['returnType']> {
		if (!this.mock) {
			return tauriInvoke<BackendCommands[C]['returnType']>(cmd, args, options);
		}

		// `in`, not truthiness. Several commands answer `null` — starting or
		// stopping a group returns nothing — and a falsy check would report
		// those as unmocked.
		if (!(cmd in this.mock)) {
			throw new Error(`No mock for backend command "${cmd}"`);
		}

		// One cast, at the read, because TypeScript cannot resolve a mapped type
		// over a generic key — it collapses `BackendCommands[C]` to `never`
		// rather than following `C` through. It restates exactly what `Mock`
		// already declares, and a wrongly-shaped entry still fails where it is
		// written, which is the place worth catching it.
		const answer = this.mock[cmd] as
			| BackendCommands[C]['returnType']
			| ((
					args: BackendCommands[C]['args'],
			  ) =>
					| BackendCommands[C]['returnType']
					| Promise<BackendCommands[C]['returnType']>);

		return typeof answer === 'function' ? await answer(args) : answer;
	}
}
