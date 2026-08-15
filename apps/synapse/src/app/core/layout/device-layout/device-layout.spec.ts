import type { Device } from '@synapse-copycat/backend-api';
import { render, screen } from '@testing-library/angular';
import { DeviceLayout } from './device-layout';

const DEVICE: Device = {
	__type: 'device',
	kind: 'mousemat',
	id: '5426-3074',
	name: 'Goliatus Extended',
	visual: 'assets/devices/5426-3074.png',
};

describe('DeviceLayout', () => {
	it('heads the section with the device portrait', async () => {
		await render(DeviceLayout, { inputs: { device: DEVICE } });

		expect(
			screen.getByRole('img', { name: 'Goliatus Extended' }),
		).toBeVisible();
	});

	it('projects the panels it is given', async () => {
		await render(
			`<device-layout [device]="device">
				<p>first panel</p>
				<p>second panel</p>
			</device-layout>`,
			{ imports: [DeviceLayout], componentProperties: { device: DEVICE } },
		);

		// Grid items, so they must be direct children of the grid container —
		// `<ng-content>` renders no element of its own, which is what makes that
		// true.
		const panels = screen.getByText('first panel').parentElement;
		expect(panels).toHaveClass('device-layout__panels');
		expect(panels?.children).toHaveLength(2);
	});

	it('renders without a device rather than failing', async () => {
		// The store is empty on a URL opened directly; the section still has to
		// draw its panels.
		await render(`<device-layout><p>a panel</p></device-layout>`, {
			imports: [DeviceLayout],
		});

		expect(screen.getByText('a panel')).toBeVisible();
		expect(screen.queryByRole('img')).not.toBeInTheDocument();
	});
});
