import { provideBackendApi, withMock } from '@synapse-copycat/backend-api';
import { render, screen } from '@testing-library/angular';
import { KeyboardPageComponent } from './keyboard-page';

const setup = () =>
	render(KeyboardPageComponent, {
		providers: [
			// Every section reads the device from the store, so the page cannot be
			// rendered without a backend behind it.
			provideBackendApi(
				withMock({
					devices: [
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
