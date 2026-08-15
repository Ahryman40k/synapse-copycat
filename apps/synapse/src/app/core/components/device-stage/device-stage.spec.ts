import { render, screen } from '@testing-library/angular';
import { DeviceStage } from './device-stage';

const setup = (inputs: Record<string, unknown> = {}) =>
	render(DeviceStage, { inputs });

describe('DeviceStage', () => {
	it('shows the device picture, named by the device', async () => {
		await setup({
			image: 'assets/devices/5426-3074.png',
			name: 'Goliatus Extended',
		});

		const image = screen.getByRole('img', { name: 'Goliatus Extended' });
		expect(image).toHaveAttribute('src', 'assets/devices/5426-3074.png');
	});

	it('shows only the backdrop when the device has no picture', async () => {
		const { container } = await setup({ name: 'Goliatus Extended' });

		expect(screen.queryByRole('img')).not.toBeInTheDocument();
		expect(container.querySelector('.device-stage__backdrop')).toBeVisible();
	});

	it('drops the picture when the file is missing', async () => {
		// `visual` is built from the ids, so it names a file even for a device
		// no artwork exists for. The broken-image glyph would read as a bug.
		const { fixture } = await setup({
			image: 'assets/devices/nope.png',
			name: 'Goliatus Extended',
		});

		screen.getByRole('img').dispatchEvent(new Event('error'));
		fixture.detectChanges();

		expect(screen.queryByRole('img')).not.toBeInTheDocument();
	});

	it('keeps the backdrop out of the accessibility tree', async () => {
		const { container } = await setup({ image: 'a.png', name: 'Goliatus' });

		// It is decoration: it carries no information the name does not.
		expect(container.querySelector('.device-stage__backdrop')).toHaveAttribute(
			'aria-hidden',
			'true',
		);
	});
});
