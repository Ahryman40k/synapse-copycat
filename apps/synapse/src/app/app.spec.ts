import {
	provideBackendApi,
	unusedCommands,
	withMock,
} from '@synapse-copycat/backend-api';
import { render } from '@testing-library/angular';
import { App } from './app';
import { ApplicationStore } from './core/stores/application-store';

describe('Application', () => {
	it('should create', async () => {
		const { fixture } = await render(App, {
			providers: [
				provideBackendApi(
					withMock({
						...unusedCommands(),
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

				ApplicationStore,
			],
		});
		const component = fixture.componentInstance;

		expect(component).toBeTruthy();
	});
});
