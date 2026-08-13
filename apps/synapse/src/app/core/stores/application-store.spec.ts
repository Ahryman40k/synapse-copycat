import { inject, TestBed } from '@angular/core/testing';
import { provideBackendApi, withMock } from '@synapse-copycat/backend-api';
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
});
