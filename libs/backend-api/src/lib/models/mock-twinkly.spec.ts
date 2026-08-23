import { BackendApiService } from '../services/backend-api';
import { unusedCommands } from './mock-defaults';
import { mockTwinkly } from './mock-twinkly';

const STRIP = 'twinkly-1c9dc285dd79';

/**
 * Through the service, exactly as the store reaches it — the entry is a
 * function-of-arguments, and `invoke` is the one caller it is written for.
 */
const setup = () =>
	new BackendApiService({
		...unusedCommands(),
		...mockTwinkly([STRIP]),
	});

describe('mockTwinkly', () => {
	it('starts lit, with a colour to show', async () => {
		const api = setup();

		const answer = await api.invoke('run_capability', {
			participant: STRIP,
			request: { type: 'TwinklyGetLighting' },
		});

		expect(answer).toEqual({
			type: 'Lighting',
			value: { on: true, color: '#ff2d95' },
		});
	});

	it('keeps what was written', async () => {
		const api = setup();

		await api.invoke('run_capability', {
			participant: STRIP,
			request: { type: 'TwinklySetPower', args: { on: false } },
		});
		await api.invoke('run_capability', {
			participant: STRIP,
			request: { type: 'TwinklySetColor', args: { color: '#123456' } },
		});

		expect(
			await api.invoke('run_capability', {
				participant: STRIP,
				request: { type: 'TwinklyGetLighting' },
			}),
		).toEqual({
			type: 'Lighting',
			value: { on: false, color: '#123456' },
		});
	});

	it('never hands out the same value twice', async () => {
		// The real IPC serialises a fresh object on every read; a shared
		// reference is how a mutation in one reader silently reaches another —
		// the drift `mockGroups` documents.
		const api = setup();
		const read = () =>
			api.invoke('run_capability', {
				participant: STRIP,
				request: { type: 'TwinklyGetLighting' },
			});

		const first = await read();
		const second = await read();

		expect(first).toEqual(second);
		expect(first).not.toBe(second);
	});

	it('refuses a strip it does not hold, the way the backend would', async () => {
		const api = setup();

		// The externally-tagged `BackendError`, not an `Error` — a
		// message-shaped refusal would make Tauri the only mode where
		// discriminating on it works.
		await expect(
			api.invoke('run_capability', {
				participant: 'twinkly-000000000000',
				request: { type: 'TwinklyGetLighting' },
			}),
		).rejects.toEqual({
			DeviceNotFound: 'twinkly-000000000000 — no sweep has seen it yet',
		});
	});
});
