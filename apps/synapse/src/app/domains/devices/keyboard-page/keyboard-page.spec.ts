import { inject, provideAppInitializer } from '@angular/core';
import { provideBackendApi, withMock } from '@synapse-copycat/backend-api';
import { render, screen } from '@testing-library/angular';
import { ApplicationStore } from '../../../core/stores/application-store';
import { KeyboardPageComponent } from './keyboard-page';

const setup = () =>
	render(KeyboardPageComponent, {
		// The `:id` segment, as `withComponentInputBinding()` supplies it.
		inputs: { id: '5426-0550' },
		providers: [
			provideBackendApi(
				withMock({
					devices: [
						{
							kind: 'mouse',
							name: 'Razer Basilisk Ultimate',
							vendor_id: 5426,
							product_id: 136,
						},
						{
							kind: 'keyboard',
							name: 'Razer Huntsman Elite',
							vendor_id: 5426,
							product_id: 550,
						},
					],
					modules: [],
				}),
			),
			// The dashboard route fills the store in the running application.
			provideAppInitializer(() => {
				void inject(ApplicationStore).getDevices();
			}),
		],
	});

describe('KeyboardPage', () => {
	it('offers customize and lighting, in that order', async () => {
		await setup();

		const tabs = screen.getAllByRole('tab');
		expect(tabs.map((tab) => tab.textContent?.trim())).toEqual([
			'customize',
			'lighting',
		]);
	});

	it('opens on customize', async () => {
		await setup();

		expect(screen.getByRole('tab', { name: 'customize' })).toHaveAttribute(
			'aria-selected',
			'true',
		);
	});

	it('hands its own device to the section it shows', async () => {
		const { fixture } = await setup();
		await fixture.whenStable();
		fixture.detectChanges();

		// The keyboard, not the mouse that shares the store. The section used to
		// read a global instead, which nothing tied to the page rendering it.
		expect(
			screen.getByRole('img', { name: 'Razer Huntsman Elite' }),
		).toBeVisible();
	});

	it('hands the same device to every section', async () => {
		const { fixture } = await setup();
		await fixture.whenStable();

		screen.getByRole('tab', { name: 'lighting' }).click();
		fixture.detectChanges();

		expect(
			screen.getByRole('img', { name: 'Razer Huntsman Elite' }),
		).toBeVisible();
	});

	it('shows the same three panels as the other devices under lighting', async () => {
		const { fixture } = await setup();

		screen.getByRole('tab', { name: 'lighting' }).click();
		fixture.detectChanges();

		expect(screen.getByRole('switch', { name: 'Brightness' })).toBeVisible();
		expect(
			screen.getByRole('slider', { name: 'Brightness level' }),
		).toBeVisible();
		expect(
			screen.getByRole('combobox', { name: 'Lighting effect' }),
		).toBeVisible();
	});
});
