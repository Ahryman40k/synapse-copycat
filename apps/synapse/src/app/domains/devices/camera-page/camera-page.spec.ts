import { provideBackendApi, withMock } from '@synapse-copycat/backend-api';
import { render, screen } from '@testing-library/angular';
import { CameraPageComponent } from './camera-page';

const setup = () =>
	render(CameraPageComponent, {
		providers: [
			provideBackendApi(
				withMock({
					devices: [
						{
							kind: 'streaming',
							name: 'Razer Kiyo',
							vendor_id: 5426,
							product_id: 3587,
						},
					],
					modules: [],
				}),
			),
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
});
