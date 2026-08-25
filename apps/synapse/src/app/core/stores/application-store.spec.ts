import { inject, TestBed } from '@angular/core/testing';
import { BackendApi } from '@synapse-copycat/backend-api';
import {
	mockGroups,
	mockTwinkly,
	provideBackendApi,
	still,
	unusedCommands,
	withMock,
} from '@synapse-copycat/backend-api';
import { DEVICE_LIGHTING_DEFAULT } from '../models/lighting';
import { STRIP_LIGHTING_DEFAULT } from '../models/strip-lighting';
import { ApplicationStore } from './application-store';

describe('ApplicationStore', () => {
	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideBackendApi(
					withMock({
						...unusedCommands(),
						devices: [
							{
								serial: 'XX0000000001',
								product_id: 1,
								vendor_id: 2,
								kind: 'mouse',
								name: 'Test mouse',
							},
							{
								serial: 'XX0000000002',
								product_id: 5432,
								vendor_id: 1236,
								kind: 'keyboard',
								name: 'Test keyboard',
							},
						],
					}),
				),
			],
		});
	});

	it('should verify that devices are available', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			await store.getDevices();
			const devices = store.devices();

			expect(devices).toHaveLength(2);

			const firstItem = devices[0];
			// The serial, because that is what the backend names a participant
			// by. Built from `vendor-product` this matched no group member.
			expect(firstItem.id).toBe('XX0000000001');
			// The picture stays keyed on the model, not on the unit.
			expect(firstItem.visual).toBe(`assets/devices/0002-0001.png`);
		},
	));

	it('selects a device by its id', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			await store.getDevices();

			expect(store.deviceById('XX0000000001')?.name).toBe('Test mouse');
		},
	));

	it('selects nothing for a device it does not hold', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			// What an address opened directly looks like: only the dashboard
			// route fills the store, so the lookup finds nothing.
			await store.getDevices();

			expect(store.deviceById('XX9999999999')).toBeUndefined();
			expect(store.deviceById(undefined)).toBeUndefined();
		},
	));

	it('changes one device only, while nothing is synced', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			await store.getDevices();

			store.setEffect('XX0000000001', 'wave');

			expect(store.lightingFor('XX0000000001').effect).toBe('wave');
			expect(store.lightingFor('XX0000000002').effect).toBe('spectrum');
		},
	));

	it('changes every device once the effect is synced', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			await store.getDevices();
			store.setSyncEffect(true, 'XX0000000001');

			store.setEffect('XX0000000001', 'wave');

			expect(store.lightingFor('XX0000000001').effect).toBe('wave');
			expect(store.lightingFor('XX0000000002').effect).toBe('wave');
		},
	));

	it('aligns the others the moment syncing is turned on', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			await store.getDevices();
			store.setEffect('XX0000000001', 'breathe');

			store.setSyncEffect(true, 'XX0000000001');

			// Waiting for the next change would leave the box ticked over devices
			// that disagree — the state it claims would not be true.
			expect(store.lightingFor('XX0000000002').effect).toBe('breathe');
		},
	));

	it('makes the devices independent again when syncing stops', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			await store.getDevices();
			store.setSyncEffect(true, 'XX0000000001');
			store.setEffect('XX0000000001', 'wave');

			store.setSyncEffect(false, 'XX0000000001');
			store.setEffect('XX0000000001', 'static');

			// Each keeps what it had; only what comes next stops propagating.
			expect(store.lightingFor('XX0000000001').effect).toBe('static');
			expect(store.lightingFor('XX0000000002').effect).toBe('wave');
		},
	));

	it('holds one flag for every panel, on every page', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			await store.getDevices();

			// Ticked on one device's page, ticked on the next one's: the flag says
			// how the devices relate, so it cannot belong to a panel.
			store.setSyncEffect(true, 'XX0000000001');

			expect(store.syncEffect()).toBe(true);
		},
	));

	it('keeps brightness and effect syncing apart', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			await store.getDevices();
			store.setSyncEffect(true, 'XX0000000001');

			store.setBrightness('XX0000000001', { activated: true, value: 40 });

			// A keyboard under the eyes is usually dimmer than a mousemat beside
			// them, so one effect everywhere does not mean one level everywhere.
			expect(store.syncBrightness()).toBe(false);
			expect(store.lightingFor('XX0000000002').brightness.value).toBe(100);
			expect(store.lightingFor('XX0000000001').brightness.value).toBe(40);
		},
	));

	it('syncs the level too, when asked', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			await store.getDevices();
			store.setSyncBrightness(true, 'XX0000000001');

			store.setBrightness('XX0000000001', { activated: false, value: 25 });

			expect(store.lightingFor('XX0000000002').brightness).toEqual({
				activated: false,
				value: 25,
			});
		},
	));

	it('leaves a device it has never heard of on the defaults', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			await store.getDevices();

			// Against the constant, not a copy of it: every field added to the
			// defaults used to break this test for no reason of its own.
			expect(store.lightingFor('XX9999999999')).toEqual(
				DEVICE_LIGHTING_DEFAULT,
			);
			expect(store.lightingFor(undefined).effect).toBe('spectrum');
		},
	));

	it('remembers nothing about a device never opened', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			// Undefined is what makes the bar fall back to its first tab, so
			// nothing has to be seeded.
			expect(store.sectionFor('XX0000000001')).toBeUndefined();
			expect(store.sectionFor(undefined)).toBeUndefined();
		},
	));

	it('remembers a section per device, not one for all of them', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			store.setSection('XX0000000001', 'lighting');
			store.setSection('XX0000000002', 'customize');

			expect(store.sectionFor('XX0000000001')).toBe('lighting');
			expect(store.sectionFor('XX0000000002')).toBe('customize');
		},
	));

	it('replaces what it remembered for a device', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			store.setSection('XX0000000001', 'lighting');
			store.setSection('XX0000000001', 'power');

			expect(store.sectionFor('XX0000000001')).toBe('power');
		},
	));
});

/**
 * The group slice, against the stateful mock rather than a table of answers.
 *
 * Worth its own block: every group method re-reads afterwards instead of
 * patching what it just sent, and that is the property to hold on to. The
 * backend can refuse — a participant already in another group — and it may
 * adjust what it was given, so anything patched locally would drift with
 * nothing to say so.
 */
describe('ApplicationStore, groups', () => {
	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideBackendApi(
					withMock({
						...unusedCommands(),
						...mockGroups(['aaa', 'bbb', 'ccc']),
					}),
				),
			],
		});
	});

	it('reads the group the backend starts with', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			await store.getGroups();

			expect(store.groups()).toHaveLength(1);
			expect(store.groups()[0].group.members).toEqual(['aaa', 'bbb', 'ccc']);
			// Everything is in it, so nothing is waiting for a group.
			expect(store.unassigned()).toEqual([]);
		},
	));

	it('follows the backend when a participant changes hands', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			await store.getGroups();
			const all = store.groups()[0].group.id;

			await store.setGroupMembers(all, ['aaa']);

			// The two it let go are unassigned now — which nothing here worked
			// out: it is what the backend answered when asked again.
			expect(store.unassigned()).toEqual(['bbb', 'ccc']);
		},
	));

	it('starts and stops without touching the members', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			await store.getGroups();
			const all = store.groups()[0].group.id;

			await store.stopGroup(all);
			expect(store.groups()[0].group.started).toBe(false);
			expect(store.groups()[0].group.members).toHaveLength(3);

			await store.startGroup(all);
			expect(store.groups()[0].group.started).toBe(true);
		},
	));

	it('names the group holding a participant when it refuses', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			await store.getGroups();
			const all = store.groups()[0].group.id;

			// `aaa` already belongs to the first group, and a participant belongs
			// to at most one — two engines painting one device would each keep
			// undoing the other.
			const outcome = await store.createGroup(
				'Second',
				['aaa'],
				still('#ff0000'),
			);

			expect(outcome).toEqual({
				ok: false,
				// Structured, not a message: `by` is what lets the interface offer
				// to move it rather than only saying no.
				problem: { kind: 'alreadyTaken', participant: 'aaa', by: all },
			});
			expect(store.groups()).toHaveLength(1);
		},
	));

	it('reports a fault differently from a refusal', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			await store.getGroups();

			// Nothing the user did wrong and nothing they can act on, so it must
			// not arrive dressed as a rule they broke.
			const outcome = await store.renameGroup(404, 'Nowhere');

			expect(outcome).toEqual({
				ok: false,
				problem: { kind: 'unknownGroup', id: 404 },
			});
		},
	));

	it('sets the cadence', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			await store.getGroups();
			const all = store.groups()[0].group.id;

			expect(await store.setGroupCadence(all, 'fast')).toEqual({ ok: true });
			expect(store.groups()[0].group.cadence).toBe('fast');
		},
	));

	it('hands a participant from one group to another', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			await store.getGroups();
			const all = store.groups()[0].group.id;

			// Make room for a second group, then move a member into it.
			await store.setGroupMembers(all, ['aaa', 'bbb']);
			await store.createGroup('Desk', ['ccc'], still('#ff0000'));
			const desk = store.groups().find((s) => s.group.name === 'Desk');

			const outcome = await store.moveParticipant('bbb', desk?.group.id ?? -1);

			expect(outcome).toEqual({ ok: true });
			// Released by the first and taken by the second, in that order —
			// the reverse would have been refused by the rule itself.
			const byName = new Map(
				store.groups().map(({ group }) => [group.name, group.members]),
			);
			expect(byName.get('All devices')).toEqual(['aaa']);
			expect(byName.get('Desk')).toEqual(['ccc', 'bbb']);
		},
	));

	it('sends nothing when a participant is dropped where it already is', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			await store.getGroups();
			const all = store.groups()[0].group.id;
			const before = store.groups()[0].group;

			expect(await store.moveParticipant('aaa', all)).toEqual({ ok: true });

			// The same object, so nothing was written: the backend persists its
			// groups on every change, and a no-op would rewrite the file.
			expect(store.groups()[0].group).toBe(before);
		},
	));

	it('refuses to move into a group that is not there', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			await store.getGroups();

			const outcome = await store.moveParticipant('aaa', 404);

			expect(outcome).toEqual({
				ok: false,
				problem: { kind: 'unknownGroup', id: 404 },
			});
			// And nothing was released on the way: the destination is checked
			// first, so a move that cannot land does not leave the participant
			// in no group.
			expect(store.groups()[0].group.members).toContain('aaa');
			expect(store.unassigned()).not.toContain('aaa');
		},
	));
});

/**
 * The strip slice — the one part of the lighting that writes to a device.
 *
 * Against the stateful mock, like the groups: the panel writes and then shows
 * what a read answers, so the property worth holding is that the two agree.
 */
describe('ApplicationStore, strips', () => {
	const STRIP = 'twinkly-1c9dc285dd79';

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideBackendApi(
					withMock({
						...unusedCommands(),
						...mockTwinkly([STRIP]),
					}),
				),
			],
		});
	});

	it('claims nothing about a strip it has not asked', inject(
		[ApplicationStore],
		(store: ApplicationStore) => {
			// Dark by default — the honest state for a device never heard from.
			expect(store.stripLightingFor(STRIP)).toEqual(STRIP_LIGHTING_DEFAULT);
			expect(store.stripLightingFor(undefined)).toEqual(STRIP_LIGHTING_DEFAULT);
		},
	));

	it('shows what the strip reported once asked', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			await store.getStripLighting(STRIP);

			// The mock's strips start lit — see `mockTwinkly` for why.
			expect(store.stripLightingFor(STRIP)).toEqual({
				on: true,
				color: '#ff2d95',
			});
		},
	));

	it('writes the switch through and reads it back', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			await store.getStripLighting(STRIP);

			store.setStripPower(STRIP, false);
			// Reflected at once, before any wire answers.
			expect(store.stripLightingFor(STRIP).on).toBe(false);

			// And the device agrees when asked again — the write reached it.
			await store.getStripLighting(STRIP);
			expect(store.stripLightingFor(STRIP).on).toBe(false);
		},
	));

	it('lands the newest of a burst of colours', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			// What a drag across the picker produces. However many of these the
			// queue skips, the one the hand settled on must be what the strip
			// ends up holding.
			store.setStripColor(STRIP, '#111111');
			store.setStripColor(STRIP, '#222222');
			store.setStripColor(STRIP, '#333333');

			// A macrotask, so the queue finishes draining first — reading in the
			// same tick would catch the device mid-burst, which is exactly the
			// window the queue exists to ride out.
			await new Promise((resolve) => setTimeout(resolve, 0));

			await store.getStripLighting(STRIP);
			expect(store.stripLightingFor(STRIP).color).toBe('#333333');
		},
	));

	it('refuses an answer in a shape it cannot trust', async () => {
		// Its own module: the point is the answer, not the participant.
		TestBed.resetTestingModule();
		TestBed.configureTestingModule({
			providers: [
				provideBackendApi(
					withMock({
						...unusedCommands(),
						// A colour the native input would silently read as black —
						// exactly what the valibot schema exists to refuse.
						run_capability: {
							type: 'Lighting',
							value: { on: true, color: 'green' },
						},
					}),
				),
			],
		});
		const store = TestBed.inject(ApplicationStore);

		await store.getStripLighting(STRIP);

		expect(store.stripLightingFor(STRIP)).toEqual(STRIP_LIGHTING_DEFAULT);
	});
});

/**
 * The backend's pushes — plug and unplug reaching the screen with no reload.
 *
 * Driven through the mock's `emit`, which is the same channel the store
 * subscribes to in Tauri mode; only the emitter differs.
 */
describe('ApplicationStore, live updates', () => {
	const KEYBOARD = {
		serial: 'XX0000000226',
		kind: 'keyboard' as const,
		name: 'Razer Huntsman Elite',
		vendor_id: 5426,
		product_id: 550,
	};

	const setup = async () => {
		TestBed.configureTestingModule({
			providers: [
				provideBackendApi(
					withMock({
						...unusedCommands(),
						devices: [KEYBOARD],
					}),
				),
			],
		});
		const store = TestBed.inject(ApplicationStore);
		const api = TestBed.inject(BackendApi);
		await store.watchForChanges();
		return { store, api };
	};

	it('follows a hotplug event', async () => {
		const { store, api } = await setup();
		await store.getDevices();
		expect(store.devices()).toHaveLength(1);

		// The keyboard left; the event carries the fresh list.
		api.emit('devices_changed', []);
		expect(store.devices()).toHaveLength(0);

		api.emit('devices_changed', [KEYBOARD]);
		expect(store.devices().map((device) => device.id)).toEqual([
			'XX0000000226',
		]);
	});

	it('follows a twinkly watch event', async () => {
		const { store, api } = await setup();

		api.emit('twinkly_devices_changed', [
			{
				participant: 'twinkly-1c9dc285dd79',
				name: 'Twinkly_85DD79',
				address: '192.168.1.201',
				product_code: 'TWS050STQ',
				leds: 50,
				profile: 'RGB',
			},
		]);

		expect(store.devices().map((device) => device.id)).toEqual([
			'twinkly-1c9dc285dd79',
		]);
	});

	it('ignores events from a source that was switched off', async () => {
		const { store, api } = await setup();
		store.setSource('chroma', false);

		// Off means off — an event repopulating the list would make the
		// switch look like it had done nothing.
		api.emit('devices_changed', [KEYBOARD]);

		expect(store.devices()).toHaveLength(0);
	});
});

/**
 * The switches in the settings decide whether a protocol is looked for at all.
 *
 * Asserted on what reaches the backend, not on what the store ends up holding:
 * the point of turning Twinkly off is that the subnet sweep does not happen,
 * and a test that only checked the resulting list would pass against a version
 * that swept and then discarded.
 */
describe('ApplicationStore, sources', () => {
	const setup = () => {
		const asked: string[] = [];

		TestBed.configureTestingModule({
			providers: [
				provideBackendApi(
					withMock({
						...unusedCommands(),
						devices: () => {
							asked.push('devices');
							return [];
						},
						twinkly_devices: () => {
							asked.push('twinkly_devices');
							return [];
						},
					}),
				),
			],
		});

		return { store: TestBed.inject(ApplicationStore), asked };
	};

	it('looks for both by default', async () => {
		const { store, asked } = setup();

		await store.getDevices();
		await store.getDiscovered();

		expect(asked).toEqual(['devices', 'twinkly_devices']);
	});

	it('does not sweep the network when Twinkly is off', async () => {
		const { store, asked } = setup();
		store.setSource('twinkly', false);

		await store.getDiscovered();

		expect(asked).toEqual([]);
		expect(store.discovered()).toEqual([]);
	});

	it('does not ask the daemon when Chroma is off', async () => {
		const { store, asked } = setup();
		store.setSource('chroma', false);

		await store.getDevices();

		expect(asked).toEqual([]);
	});

	it('forgets what a switched-off source had found', async () => {
		// Otherwise a device stays on the dashboard after the source that found
		// it was turned off, which reads as the switch having done nothing.
		const { store } = setup();
		await store.getDiscovered();
		store.setSource('twinkly', false);
		await store.getDiscovered();

		expect(store.discovered()).toEqual([]);
	});
});

/**
 * A machine with a light string and no Razer hardware.
 *
 * ⚠️ This is the shape of a real failure: `unassigned_participants` refused
 * because there was no daemon to list, the store read it alongside the groups
 * in one `Promise.all`, and the refusal buried them. The dashboard showed no
 * groups, and creating one appeared to do nothing — every group command
 * re-reads through `getGroups`, and the re-read threw.
 */
describe('ApplicationStore, with half the backend answering', () => {
	const setup = () => {
		TestBed.configureTestingModule({
			providers: [
				provideBackendApi(
					withMock({
						...unusedCommands(),
						...mockGroups(['aaa']),
						unassigned_participants: () => {
							throw new Error('The OpenRazer daemon is unavailable');
						},
					}),
				),
			],
		});
		return TestBed.inject(ApplicationStore);
	};

	it('still reads the groups when the daemon cannot be asked', async () => {
		const store = setup();

		await store.getGroups();

		expect(store.groups()).toHaveLength(1);
	});

	it('still creates a group', async () => {
		// The command succeeded in the backend; it was the re-read that threw,
		// so the interface never saw what it had just made.
		const store = setup();
		await store.getGroups();

		const outcome = await store.createGroup('Desk', [], still('#00ff00'));

		expect(outcome).toEqual({ ok: true });
		expect(store.groups().map(({ group }) => group.name)).toContain('Desk');
	});

	it('leaves the tray empty rather than the page', async () => {
		const store = setup();

		await store.getGroups();

		expect(store.claimable()).toEqual([]);
	});
});

/**
 * What reaches the store when the backend answers something it should not.
 *
 * ⚠️ These are the tests that make the validators worth having. Every read
 * crossing the IPC boundary is parsed now (root AGENTS.md §6), and the
 * behaviour chosen was **degrade and say so**, not throw: the route resolvers
 * do not await these calls, so a rejection would be an unhandled promise rather
 * than anything a reader ever sees.
 *
 * The console is spied on rather than left to print — a suite that shouts on
 * every run teaches people to ignore it — but it is also *asserted*, because
 * "dropped in silence" is the failure mode this whole change exists to prevent.
 */
describe('ApplicationStore, against a backend that answers badly', () => {
	let warn: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
	});

	afterEach(() => warn.mockRestore());

	const withDevices = (devices: unknown) => {
		TestBed.configureTestingModule({
			providers: [
				provideBackendApi(
					withMock({
						...unusedCommands(),
						// Cast at the mock, deliberately: the point of the test is
						// an answer the contract says is impossible.
						devices: devices as never,
					}),
				),
			],
		});
		return TestBed.inject(ApplicationStore);
	};

	it('keeps the devices it can read and drops the one it cannot', async () => {
		const store = withDevices([
			{
				serial: 'XX0000000001',
				kind: 'mouse',
				name: 'Test mouse',
				vendor_id: 2,
				product_id: 1,
			},
			// No serial — so nothing could name it as a group member anyway.
			{ kind: 'keyboard', name: 'Nameless', vendor_id: 2, product_id: 2 },
		]);

		await store.getDevices();

		expect(store.wired().map((device) => device.id)).toEqual(['XX0000000001']);
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('dropped 1 of 2'),
		);
	});

	/**
	 * `strip` is invented by the store for a Twinkly and can only ever reach the
	 * `devices` wire by mistake — see `WireDeviceKind`.
	 */
	it('refuses a kind no enumeration can carry', async () => {
		const store = withDevices([
			{
				serial: 'XX0000000001',
				kind: 'strip',
				name: 'Not a Razer device',
				vendor_id: 2,
				product_id: 1,
			},
		]);

		await store.getDevices();

		expect(store.wired()).toEqual([]);
	});

	it('shows no groups rather than a broken one', async () => {
		TestBed.configureTestingModule({
			providers: [
				provideBackendApi(
					withMock({
						...unusedCommands(),
						// `Slow` — the casing tauri-typegen guessed, against the
						// `#[serde(rename_all = "lowercase")]` the Rust enum
						// actually carries.
						groups: [
							{
								group: {
									id: 0,
									name: 'Desk',
									members: [],
									ambience: still('#00ff00'),
									cadence: 'Slow',
									started: true,
								},
								devices: [],
								skipped: [],
							},
						] as never,
					}),
				),
			],
		});
		const store = TestBed.inject(ApplicationStore);

		await store.getGroups();

		expect(store.groups()).toEqual([]);
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('cadence'));
	});

	/**
	 * The hotplug event carries exactly what the fetch answers, so it has to be
	 * held to exactly the same standard — a validator on only one of the two
	 * would leave the other as the way in.
	 */
	it('holds a hotplug event to the same rule as a fetch', async () => {
		TestBed.configureTestingModule({
			providers: [provideBackendApi(withMock({ ...unusedCommands() }))],
		});
		const store = TestBed.inject(ApplicationStore);
		const api = TestBed.inject(BackendApi);
		await store.watchForChanges();

		api.emit('devices_changed', [{ kind: 'mouse' }] as never);

		expect(store.wired()).toEqual([]);
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('dropped 1 of 1'),
		);
	});
});

/**
 * A machine with a light string and no OpenRazer daemon.
 *
 * ⚠️ Not a fault, and the ordinary case for anyone who owns a Twinkly and no
 * Razer hardware. `getGroups` was fixed for exactly this and documents it; the
 * device reads beside it were not, and this is that parity.
 */
describe('ApplicationStore, with no daemon at all', () => {
	let warn: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
	});

	afterEach(() => warn.mockRestore());

	const refuse = () => {
		throw new Error('The OpenRazer daemon is unavailable');
	};

	const setup = () => {
		TestBed.configureTestingModule({
			providers: [
				provideBackendApi(
					withMock({
						...unusedCommands(),
						devices: refuse,
						twinkly_devices: refuse,
						watch_twinkly: refuse,
					}),
				),
			],
		});
		return TestBed.inject(ApplicationStore);
	};

	/**
	 * ⚠️ It used to reject. `devicesResolver` calls this and returns what the
	 * store already holds without awaiting, so the rejection was unhandled: the
	 * dashboard rendered anyway, every tile showing a raw serial with no name
	 * and no picture, and nothing said the daemon was missing.
	 */
	it('does not reject when the daemon cannot be asked', async () => {
		const store = setup();

		await expect(store.getDevices()).resolves.toEqual([]);
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('could not enumerate the devices'),
			expect.anything(),
		);
	});

	it('does not reject when the sweep fails', async () => {
		const store = setup();

		await expect(store.getDiscovered()).resolves.toEqual([]);
	});

	/**
	 * ⚠️ The worst of the three, and invisible. Asserting the Twinkly watch was
	 * the first `await` in `watchForChanges`, so a backend that refused it threw
	 * before either `listen` ran — plugging a keyboard in then did nothing at
	 * all, for the rest of the session, with no error anyone would see.
	 */
	it('still subscribes to hotplug when the watch cannot be asserted', async () => {
		const store = setup();
		const api = TestBed.inject(BackendApi);

		await store.watchForChanges();
		api.emit('devices_changed', [
			{
				serial: 'XX0000000226',
				kind: 'keyboard',
				name: 'Razer Huntsman Elite',
				vendor_id: 5426,
				product_id: 550,
			},
		]);

		expect(store.wired().map((device) => device.name)).toEqual([
			'Razer Huntsman Elite',
		]);
	});
});
