import { TestBed } from '@angular/core/testing';
import { makeAppConfig } from './app.config';
import { ApplicationStore } from './core/stores/application-store';

/**
 * The browser path's own data, through the browser path's own validators.
 *
 * ⚠️ **This is the test that guards the trap.** `Mock` is derived from
 * `BackendCommands`, so a wrongly-shaped mock *should* be a compile error — but
 * Vitest transpiles via esbuild without typechecking and there is no
 * `typecheck` target, so a broken mock compiles, runs and passes green (root
 * AGENTS.md §7). Now that every answer is parsed, a mock that drifts from the
 * schemas would not fail loudly either: it would quietly show fewer devices
 * than it declares, in the one mode the whole interface is developed in.
 *
 * So the assertion is not only "six devices arrived". It is **that nothing was
 * warned about** — a dropped record is the only evidence a validator and the
 * fixture it validates have stopped agreeing.
 */
describe('the application mock, against its own validators', () => {
	let warn: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		TestBed.configureTestingModule({
			providers: makeAppConfig({ envName: 'test' }).providers,
		});
	});

	afterEach(() => warn.mockRestore());

	it('enumerates every device it declares, dropping none', async () => {
		const store = TestBed.inject(ApplicationStore);

		await store.getDevices();

		// The six the fake daemon reports, mirrored verbatim in `app.config.ts`.
		expect(store.wired()).toHaveLength(6);
		expect(warn).not.toHaveBeenCalled();
	});

	/**
	 * The riskiest of the new validators: `GroupStatus` reaches down through
	 * `Ambience` and `Cadence` into shapes a Rust test fixes as an exact JSON
	 * string. A casing slip anywhere in there empties the dashboard.
	 */
	it('reads the seeded group whole', async () => {
		const store = TestBed.inject(ApplicationStore);

		await store.getGroups();

		expect(store.groups()).toHaveLength(1);
		expect(store.groups()[0].group.members).toHaveLength(6);
		expect(warn).not.toHaveBeenCalled();
	});

	it('finds the strip it declares', async () => {
		const store = TestBed.inject(ApplicationStore);

		await store.getDiscovered();

		expect(store.discovered()).toHaveLength(1);
		expect(store.discovered()[0].kind).toBe('strip');
		expect(warn).not.toHaveBeenCalled();
	});
});
