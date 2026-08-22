import type { Mock } from './mock';
import { mockGroups } from './mock-groups';

/**
 * Answers for the commands a test or story does not exercise.
 *
 * `Mock` is deliberately **not** partial: it is derived from
 * `BackendCommands`, so adding a command makes every incomplete mock a
 * compile error, and that is the safety net root AGENTS.md §7 asks for. Adding
 * the group commands duly broke thirteen call sites at once.
 *
 * Most of those thirteen are a story about a settings page or a spec about a
 * device list, and they genuinely do not care about groups. Spreading this is
 * how they say so:
 *
 * ```ts
 * withMock({ ...unusedCommands(), devices: [ … ] })
 * ```
 *
 * The opt-out is visible in the call, which is the difference between this and
 * making `Mock` partial. And the application's own mock in `app.config.ts`
 * still lists everything, so the net stays taut where it matters: the next
 * command added will break *that* one, which is the one that has to answer.
 */
export function unusedCommands(): Mock {
	return {
		devices: [],
		modules: [],
		twinkly_devices: [],
		...mockGroups([]),
	};
}
