import { inject, TestBed } from '@angular/core/testing';
import { provideBackendApi, withMock } from '@synapse-copycat/backend-api';
import { DEVICE_LIGHTING_DEFAULT } from '../models/lighting';
import { ApplicationStore } from './application-store';

describe('ApplicationStore', () => {
	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideBackendApi(
					withMock({
						devices: [
							{
								product_id: 1,
								vendor_id: 2,
								kind: 'mouse',
								name: 'Test mouse',
							},
							{
								product_id: 5432,
								vendor_id: 1236,
								kind: 'keyboard',
								name: 'Test keyboard',
							},
						],
						modules: [],
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
			expect(firstItem.id).toBe('0002-0001');
			expect(firstItem.visual).toBe(`assets/devices/0002-0001.png`);
		},
	));

	it('selects a device by its id', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			await store.getDevices();

			expect(store.deviceById('0002-0001')?.name).toBe('Test mouse');
		},
	));

	it('selects nothing for a device it does not hold', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			// What an address opened directly looks like: only the dashboard
			// route fills the store, so the lookup finds nothing.
			await store.getDevices();

			expect(store.deviceById('9999-9999')).toBeUndefined();
			expect(store.deviceById(undefined)).toBeUndefined();
		},
	));

	it('changes one device only, while nothing is synced', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			await store.getDevices();

			store.setEffect('0002-0001', 'wave');

			expect(store.lightingFor('0002-0001').effect).toBe('wave');
			expect(store.lightingFor('1236-5432').effect).toBe('spectrum');
		},
	));

	it('changes every device once the effect is synced', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			await store.getDevices();
			store.setSyncEffect(true, '0002-0001');

			store.setEffect('0002-0001', 'wave');

			expect(store.lightingFor('0002-0001').effect).toBe('wave');
			expect(store.lightingFor('1236-5432').effect).toBe('wave');
		},
	));

	it('aligns the others the moment syncing is turned on', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			await store.getDevices();
			store.setEffect('0002-0001', 'breathe');

			store.setSyncEffect(true, '0002-0001');

			// Waiting for the next change would leave the box ticked over devices
			// that disagree — the state it claims would not be true.
			expect(store.lightingFor('1236-5432').effect).toBe('breathe');
		},
	));

	it('makes the devices independent again when syncing stops', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			await store.getDevices();
			store.setSyncEffect(true, '0002-0001');
			store.setEffect('0002-0001', 'wave');

			store.setSyncEffect(false, '0002-0001');
			store.setEffect('0002-0001', 'static');

			// Each keeps what it had; only what comes next stops propagating.
			expect(store.lightingFor('0002-0001').effect).toBe('static');
			expect(store.lightingFor('1236-5432').effect).toBe('wave');
		},
	));

	it('holds one flag for every panel, on every page', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			await store.getDevices();

			// Ticked on one device's page, ticked on the next one's: the flag says
			// how the devices relate, so it cannot belong to a panel.
			store.setSyncEffect(true, '0002-0001');

			expect(store.syncEffect()).toBe(true);
		},
	));

	it('keeps brightness and effect syncing apart', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			await store.getDevices();
			store.setSyncEffect(true, '0002-0001');

			store.setBrightness('0002-0001', { activated: true, value: 40 });

			// A keyboard under the eyes is usually dimmer than a mousemat beside
			// them, so one effect everywhere does not mean one level everywhere.
			expect(store.syncBrightness()).toBe(false);
			expect(store.lightingFor('1236-5432').brightness.value).toBe(100);
			expect(store.lightingFor('0002-0001').brightness.value).toBe(40);
		},
	));

	it('syncs the level too, when asked', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			await store.getDevices();
			store.setSyncBrightness(true, '0002-0001');

			store.setBrightness('0002-0001', { activated: false, value: 25 });

			expect(store.lightingFor('1236-5432').brightness).toEqual({
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
			expect(store.lightingFor('9999-9999')).toEqual(DEVICE_LIGHTING_DEFAULT);
			expect(store.lightingFor(undefined).effect).toBe('spectrum');
		},
	));

	it('remembers nothing about a device never opened', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			// Undefined is what makes the bar fall back to its first tab, so
			// nothing has to be seeded.
			expect(store.sectionFor('0002-0001')).toBeUndefined();
			expect(store.sectionFor(undefined)).toBeUndefined();
		},
	));

	it('remembers a section per device, not one for all of them', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			store.setSection('0002-0001', 'lighting');
			store.setSection('1236-5432', 'customize');

			expect(store.sectionFor('0002-0001')).toBe('lighting');
			expect(store.sectionFor('1236-5432')).toBe('customize');
		},
	));

	it('replaces what it remembered for a device', inject(
		[ApplicationStore],
		async (store: ApplicationStore) => {
			store.setSection('0002-0001', 'lighting');
			store.setSection('0002-0001', 'power');

			expect(store.sectionFor('0002-0001')).toBe('power');
		},
	));
});
