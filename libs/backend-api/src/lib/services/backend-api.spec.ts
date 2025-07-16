import type { Mock } from '../models';
import { BackendApiService } from './backend-api';

const mock: Mock = {
	devices: [
		{
			__type: 'device',
			kind: 'mouse',
			name: 'Razer Basilisk Ultimate',
			id: '5426-0136',
			visual: 'asssets/devices/5436-0136.png',
		},
		{
			__type: 'device',
			kind: 'mousemat',
			name: 'Goliatus Extended',
			id: '5626-3074',
			visual: 'assets/devices/5436-3074.png',
		},
	],
	modules: [
		{
			__type: 'module',
			kind: 'twinkly',
			name: 'Twinlky',
			visual: 'asssets/modules/twinkly.png',
		},
	],
} satisfies Mock;

describe('BackendApi Service', () => {
	it('Should return the mock value', async () => {
		const service = new BackendApiService(mock);

		expect(await service.invoke('devices', {})).toMatchObject(mock.devices);
		expect(await service.invoke('modules', {})).toMatchObject(mock.modules);
	});

	it('Should throw when no mock are defined', async () => {
		const service = new BackendApiService(undefined);

		await expect(service.invoke('devices', {})).rejects.toThrowError();
	});
});
