import { inject, provideAppInitializer } from '@angular/core';
import {
	provideBackendApi,
	unusedCommands,
	withMock,
} from '@synapse-copycat/backend-api';
import { render, screen } from '@testing-library/angular';
import { ApplicationStore } from '../../../core/stores/application-store';
import { CameraPageComponent } from './camera-page';

const setup = () =>
	render(CameraPageComponent, {
		// The `:id` segment, as `withComponentInputBinding()` supplies it.
		inputs: { id: 'XX0000000E03' },
		providers: [
			provideBackendApi(
				withMock({
					...unusedCommands(),
					devices: [
						{
							serial: 'XX0000000E03',
							kind: 'streaming',
							name: 'Razer Kiyo',
							vendor_id: 5426,
							product_id: 3587,
						},
					],
				}),
			),
			// The dashboard route fills the store in the running application.
			provideAppInitializer(() => {
				void inject(ApplicationStore).getDevices();
			}),
		],
	});

describe('CameraPage', () => {
	it('has a single section', async () => {
		await setup();

		const tabs = screen.getAllByRole('tab');
		expect(tabs.map((tab) => tab.textContent?.trim())).toEqual(['customize']);
	});

	it('shows the camera and the image panels', async () => {
		await setup();

		expect(screen.getByRole('heading', { name: 'Camera' })).toBeVisible();
		expect(screen.getByRole('heading', { name: 'Image' })).toBeVisible();
		expect(screen.getByRole('switch', { name: 'Preview' })).toBeVisible();
		expect(screen.getByRole('group', { name: 'Picture preset' })).toBeVisible();
	});

	it('hands its own device to the section it shows', async () => {
		const { fixture } = await setup();
		await fixture.whenStable();
		fixture.detectChanges();

		expect(screen.getByRole('img', { name: 'Razer Kiyo' })).toBeVisible();
	});
});
