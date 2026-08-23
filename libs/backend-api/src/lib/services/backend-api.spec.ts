import { type Mock, still, unusedCommands } from '../models';
import { BackendApiService } from './backend-api';

/**
 * The **wire** shape, which is not the app-facing one.
 *
 * This mock used to carry `__type`, `id` and `visual` — fields the store
 * builds, that never cross the boundary. It compiled because Vitest
 * transpiles without typechecking, and root AGENTS.md §7 cites it as the live
 * example of that. It is corrected here rather than left as the warning.
 */
const mock: Mock = {
	...unusedCommands(),
	devices: [
		{
			serial: 'XX0000000088',
			kind: 'mouse',
			name: 'Razer Basilisk Ultimate',
			vendor_id: 5426,
			product_id: 136,
		},
		{
			serial: 'XX0000000C02',
			kind: 'mousemat',
			name: 'Goliatus Extended',
			vendor_id: 5426,
			product_id: 3074,
		},
	],
	modules: [{ kind: 'twinkly', name: 'Twinlky' }],
};

describe('BackendApi Service', () => {
	it('answers from the mock', async () => {
		const service = new BackendApiService(mock);

		expect(await service.invoke('devices', {})).toMatchObject(mock.devices);
		expect(await service.invoke('modules', {})).toMatchObject(mock.modules);
	});

	it('goes to Tauri when there is no mock', async () => {
		const service = new BackendApiService(undefined);

		// Nothing to invoke against outside a Tauri window.
		await expect(service.invoke('devices', {})).rejects.toThrowError();
	});

	it('runs a mock that is a function of its arguments', async () => {
		// What the group commands need: a table of constants cannot express
		// "create one, then list it".
		const service = new BackendApiService(mock);

		const id = await service.invoke('create_group', {
			name: 'Desk',
			members: ['5426-0136'],
			ambience: still('#00ff00'),
		});

		const groups = await service.invoke('groups', {});
		expect(groups.map((status) => status.group.name)).toContain('Desk');
		expect(typeof id).toBe('number');
	});

	it('treats a null answer as an answer', async () => {
		// Eight of the group commands return nothing. A truthiness check would
		// have reported those as unmocked, which is the bug this holds shut.
		const service = new BackendApiService(mock);
		const id = await service.invoke('create_group', {
			name: 'Evening',
			members: [],
			ambience: still('#ff0000'),
		});

		await expect(service.invoke('start_group', { id })).resolves.toBeNull();
	});

	it('says which command has no mock', async () => {
		const incomplete = { devices: [] } as unknown as Mock;
		const service = new BackendApiService(incomplete);

		await expect(service.invoke('modules', {})).rejects.toThrowError(/modules/);
	});
});

/**
 * The event channel, in mock mode: `listen` holds the handler and `emit` is
 * the test's hand on the backend's lever. Under Tauri neither branch runs —
 * `listen` goes to the real channel and `emit` refuses.
 */
describe('BackendApi Service, events', () => {
	it('carries an emitted event to a listener', async () => {
		const service = new BackendApiService(mock);
		const seen: unknown[] = [];

		await service.listen('twinkly_devices_changed', (found) => {
			seen.push(found);
		});
		service.emit('twinkly_devices_changed', []);

		expect(seen).toEqual([[]]);
	});

	it('stops carrying after the unsubscribe', async () => {
		const service = new BackendApiService(mock);
		const seen: unknown[] = [];

		const unlisten = await service.listen('devices_changed', (found) => {
			seen.push(found);
		});
		unlisten();
		service.emit('devices_changed', []);

		expect(seen).toEqual([]);
	});

	it('refuses to emit without a mock', () => {
		// Under Tauri the Rust backend is the only emitter; a test that could
		// emit past it would pass against a channel the app never uses.
		const service = new BackendApiService(undefined);

		expect(() => service.emit('devices_changed', [])).toThrowError(/mock/);
	});
});
