import {
	type InvokeOptions,
	invoke as tauriInvoke,
} from '@tauri-apps/api/core';
import { listen as tauriListen } from '@tauri-apps/api/event';
import type { BackendCommands, BackendEvents, Mock } from '../models';

export class BackendApiService {
	/**
	 * The mock's subscribers, so `emit` can reach them. Unused under Tauri,
	 * where the real event channel does the carrying.
	 */
	readonly #handlers = new Map<
		keyof BackendEvents,
		Set<(payload: unknown) => void>
	>();

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

	/**
	 * Subscribe to a backend push. Resolves to the unsubscribe.
	 *
	 * Under Tauri this is the real event channel. Under the mock nothing ever
	 * fires on its own — a browser has no hotplug — but the handler is held,
	 * so a test or story can drive it through `emit` and exercise the exact
	 * path the running application uses.
	 */
	async listen<E extends keyof BackendEvents>(
		event: E,
		handler: (payload: BackendEvents[E]) => void,
	): Promise<() => void> {
		if (!this.mock) {
			return tauriListen<BackendEvents[E]>(event, (received) =>
				handler(received.payload),
			);
		}

		const handlers = this.#handlers.get(event) ?? new Set();
		// One cast at the write, mirroring `invoke`: the map cannot keep the
		// payload type per key, and the pair is put back together in `emit`.
		handlers.add(handler as (payload: unknown) => void);
		this.#handlers.set(event, handlers);
		return () => {
			handlers.delete(handler as (payload: unknown) => void);
		};
	}

	/**
	 * Fire an event exactly as the backend would. **Mock mode only** — under
	 * Tauri the Rust side is the only emitter, and a test that emitted past it
	 * would pass against a channel the running application never uses.
	 */
	emit<E extends keyof BackendEvents>(
		event: E,
		payload: BackendEvents[E],
	): void {
		if (!this.mock) {
			throw new Error(
				'emit is for the mock — under Tauri the backend is the only emitter',
			);
		}
		for (const handler of this.#handlers.get(event) ?? []) {
			handler(payload);
		}
	}
}
