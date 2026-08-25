import { render } from '@testing-library/angular';
import { DefaultLayout } from './default-layout';
import {
	provideBackendApi,
	unusedCommands,
	withMock,
} from '@synapse-copycat/backend-api';

const providers = [
	provideBackendApi(
		withMock({
			...unusedCommands(),
			devices: [
				{
					serial: 'XX21',
					product_id: 1,
					vendor_id: 2,
					kind: 'mouse',
					name: 'Test mouse',
				},
				{
					serial: 'XX12365432',
					product_id: 5432,
					vendor_id: 1236,
					kind: 'keyboard',
					name: 'Test keyboard',
				},
			],
		}),
	),
];

describe('Default Layout Template', () => {
	it('should create', async () => {
		const { fixture } = await render(DefaultLayout, { providers });

		const component = fixture.componentInstance;

		expect(component).toBeTruthy();
	});
});
