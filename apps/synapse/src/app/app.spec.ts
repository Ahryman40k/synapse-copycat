import {render} from '@testing-library/angular'
import {App} from './app'

describe('Application', () => {
it('should create', async () => {
		const { fixture } = await render(App, {
		});
		const component = fixture.componentInstance;

		expect(component).toBeTruthy();
	});
});
