import { inject, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideBackendApi, withMock } from '@synapse-copycat/backend-api';
import { EMPTY } from 'rxjs';
import { ApplicationStore, deviceIdFromUrl } from './application-store';

/**
 * Only `url` and `events` are read. A real router would need routes, a
 * location strategy and a navigation to say the same thing.
 */
const atUrl = (url: string) => ({
	provide: Router,
	useValue: { url, events: EMPTY },
});

describe('deviceIdFromUrl', () => {
	it('takes the id out of a device address', () => {
		expect(deviceIdFromUrl('/device/mousemat/5426-3074')).toBe('5426-3074');
	});

	it('ignores the query string', () => {
		expect(deviceIdFromUrl('/device/mouse/5426-0136?tab=lighting')).toBe(
			'5426-0136',
		);
	});

	it('finds none away from a device page', () => {
		expect(deviceIdFromUrl('/dashboard')).toBeUndefined();
		expect(deviceIdFromUrl('/')).toBeUndefined();
	});
});

describe('ApplicationStore selection', () => {
	const setup = async (url: string) => {
		TestBed.configureTestingModule({
			providers: [
				provideBackendApi(
					withMock({
						devices: [
							{
								kind: 'mouse',
								name: 'Basilisk',
								vendor_id: 5426,
								product_id: 136,
							},
						],
						modules: [],
					}),
				),
				atUrl(url),
			],
		});

		const store = TestBed.inject(ApplicationStore);
		await store.getDevices();
		return store;
	};

	it('selects the device the address names', async () => {
		const store = await setup('/device/mouse/5426-0136');

		expect(store.currentDeviceId()).toBe('5426-0136');
		expect(store.currentDevice()?.name).toBe('Basilisk');
	});

	it('selects nothing away from a device page', async () => {
		const store = await setup('/dashboard');

		expect(store.currentDevice()).toBeUndefined();
	});

	it('selects nothing for a device it does not hold', async () => {
		// What an address opened directly looks like: only the dashboard route
		// fills the store, so the selection finds nothing.
		const store = await setup('/device/mouse/9999-9999');

		expect(store.currentDevice()).toBeUndefined();
	});
});

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
});
