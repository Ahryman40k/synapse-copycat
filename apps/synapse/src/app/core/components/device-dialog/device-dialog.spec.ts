import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
	provideBackendApi,
	still,
	unusedCommands,
	withMock,
} from '@synapse-copycat/backend-api';
import type { Device } from '@synapse-copycat/backend-api';
import { render, screen } from '@testing-library/angular';
import { type DeviceDetail, DeviceDialog } from './device-dialog';

/**
 * The dialog is a frame: it names the device, says what the engine is doing
 * with it, and renders the device's own page inside itself. What the page shows
 * is the page's business and is tested beside it — what is asserted here is the
 * framing, and the one line no page could produce.
 */
const HUNTSMAN: Device = {
	__type: 'device',
	kind: 'keyboard',
	id: '5426-0550',
	name: 'Huntsman Elite',
	visual: 'assets/devices/5426-0550.png',
};

const setup = async (detail: DeviceDetail) => {
	const closed: number[] = [];
	return {
		...(await render(DeviceDialog, {
			providers: [
				{ provide: DIALOG_DATA, useValue: detail },
				{ provide: DialogRef, useValue: { close: () => closed.push(1) } },
				// The hosted page reaches the store, which reaches the backend.
				provideBackendApi(withMock(unusedCommands())),
			],
		})),
		closed,
	};
};

const running = (over: Partial<DeviceDetail> = {}): DeviceDetail => ({
	participant: '5426-0550',
	device: HUNTSMAN,
	group: { name: 'Desk', ambience: still('#00ff00'), started: true },
	status: {
		serial: '5426-0550',
		painted: true,
		achieved: { requested: 'normal', perFrameMs: 7.8, frames: 30, every: 1 },
	},
	...over,
});

describe('DeviceDialog', () => {
	it('names the device and shows its own page', async () => {
		await setup(running());

		expect(
			screen.getByRole('heading', { name: 'Huntsman Elite' }),
		).toBeVisible();
		expect(screen.getByText('5426-0550')).toBeVisible();
		// The keyboard page, rendered in place — its tabs are the proof.
		expect(
			screen.getByRole('tablist', { name: 'Keyboard sections' }),
		).toBeVisible();
	});

	describe('what the engine is doing with it', () => {
		it('names the group, what it shows, and at what rate', async () => {
			await setup(running());

			expect(
				screen.getByText('In Desk, showing the full picture at 30 Hz'),
			).toBeVisible();
		});

		it('says a device is pacing itself rather than failing', async () => {
			// Taking every fourth tick is how a slow device keeps the rest of the
			// group at its rate.
			await setup(
				running({
					status: {
						serial: '5426-0550',
						painted: true,
						achieved: {
							requested: 'normal',
							perFrameMs: 24.6,
							frames: 30,
							every: 4,
						},
					},
				}),
			);

			expect(
				screen.getByText(
					'In Desk, showing the full picture at 8 Hz, every 4 ticks',
				),
			).toBeVisible();
		});

		it('does not call an averaged colour a failure', async () => {
			// A single-LED mousemat has nowhere to put a picture.
			await setup(
				running({
					status: {
						serial: '5426-0550',
						painted: false,
						achieved: {
							requested: 'normal',
							perFrameMs: 1.2,
							frames: 30,
							every: 1,
						},
					},
				}),
			);

			expect(screen.getByText(/one averaged colour/)).toBeVisible();
		});

		it('says nothing is measured while the group is stopped', async () => {
			await setup(
				running({
					group: { name: 'Desk', ambience: still('#00ff00'), started: false },
					status: undefined,
				}),
			);

			expect(screen.getByText('In Desk, stopped')).toBeVisible();
		});

		it('says it is still measuring in the first second', async () => {
			await setup(
				running({
					status: {
						serial: '5426-0550',
						painted: true,
						achieved: {
							requested: 'normal',
							perFrameMs: 0,
							frames: 0,
							every: 1,
						},
					},
				}),
			);

			expect(screen.getByText(/measuring…/)).toBeVisible();
		});

		it('gives the reason when the engine could not take it on', async () => {
			await setup(
				running({
					status: undefined,
					skipped: { serial: '5426-0550', because: 'no lighting interface' },
				}),
			);

			expect(screen.getByText('no lighting interface')).toBeVisible();
		});

		it('says when nothing is driving it', async () => {
			await setup({ participant: '5426-0550', device: HUNTSMAN });

			expect(
				screen.getByText('In no group — nothing is driving it'),
			).toBeVisible();
		});
	});

	it('shows no page for a kind that has none', async () => {
		// The dock is not something you set anything on.
		await setup({
			participant: '5426-0126',
			device: {
				__type: 'device',
				kind: 'accessory',
				id: '5426-0126',
				name: 'Basilisk dock',
				visual: 'assets/devices/5426-0126.png',
			},
		});

		expect(screen.getByText(/Nothing to set on this one/)).toBeVisible();
		expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
	});

	it('falls back to the identifier for a device it cannot describe', async () => {
		// A Govee strip will be a participant long before there is a picture of
		// one. A blank frame would be worse than its id.
		await setup({ participant: 'govee-42' });

		expect(screen.getByRole('heading', { name: 'govee-42' })).toBeVisible();
	});

	it('closes', async () => {
		const { closed } = await setup(running());

		screen.getByRole('button', { name: 'Close' }).click();

		expect(closed).toEqual([1]);
	});
});
