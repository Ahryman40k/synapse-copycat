import { Dialog } from '@angular/cdk/dialog';
import { Component, inject } from '@angular/core';
import {
	type Mock,
	provideBackendApi,
	still,
	unusedCommands,
	withMock,
} from '@synapse-copycat/backend-api';
import type { Device } from '@synapse-copycat/backend-api';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { type DeviceDetail, DeviceDialog } from './device-dialog';

/**
 * Opened the way the dashboard opens it — through the CDK's `Dialog`, into the
 * overlay container, with the name on the config rather than on the component:
 * the container is the element carrying the dialog role.
 */
@Component({
	selector: 'device-dialog-story-host',
	template: '<button type="button" (click)="show()">Inspect</button>',
})
export class DeviceDialogStoryHost {
	readonly #dialog = inject(Dialog);
	detail!: DeviceDetail;

	show(): void {
		this.#dialog.open(DeviceDialog, {
			data: this.detail,
			panelClass: 'syn-dialog-panel',
			ariaLabel: this.detail.device?.name ?? this.detail.participant,
		});
	}
}

const HUNTSMAN: Device = {
	__type: 'device',
	kind: 'keyboard',
	id: '5426-0550',
	name: 'Huntsman Elite',
	visual: 'assets/devices/5426-0550.png',
};

const meta: Meta<DeviceDialogStoryHost> = {
	// No .mdx beside this one, so Storybook generates the docs page.
	tags: ['autodocs'],
	component: DeviceDialogStoryHost,
	title: 'Synapse application / Components / device dialog',
	decorators: [
		moduleMetadata({ imports: [DeviceDialogStoryHost] }),
		// The hosted page reaches the store, which reaches the backend.
		applicationConfig({
			providers: [provideBackendApi(withMock(unusedCommands() as Mock))],
		}),
	],
	render: (args) => ({ props: args }),
};
export default meta;

type Story = StoryObj<DeviceDialogStoryHost>;

const open = async (canvasElement: HTMLElement) => {
	await userEvent.click(
		within(canvasElement).getByRole('button', { name: 'Inspect' }),
	);
	return await within(document.body).findByRole('dialog');
};

/** A modal left open lives in the top layer and outlives its story. */
const close = async (dialog: HTMLElement) => {
	await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
	await waitFor(async () => {
		await expect(
			within(document.body).queryByRole('dialog'),
		).not.toBeInTheDocument();
	});
};

export const Driven: Story = {
	name: 'Driven by a running group',
	args: {
		detail: {
			participant: '5426-0550',
			device: HUNTSMAN,
			group: { name: 'Desk', ambience: still('#00ff00'), started: true },
			status: {
				serial: '5426-0550',
				painted: true,
				achieved: {
					requested: 'normal',
					perFrameMs: 7.8,
					frames: 30,
					every: 1,
				},
			},
		},
	},
	play: async ({ canvasElement }) => {
		const dialog = await open(canvasElement);
		const inside = within(dialog);

		await expect(
			inside.getByRole('heading', { name: 'Huntsman Elite' }),
		).toBeVisible();
		await expect(
			inside.getByText('In Desk, showing the full picture at 30 Hz'),
		).toBeVisible();

		// The device's own page, rendered in place — its tabs are the proof.
		// ⚠️ `findBy`, because the page is a chunk fetched when the dialog opens.
		// This is also the only place that assertion can live: the promise a
		// dynamic `import()` returns never settles under jsdom.
		await expect(
			await inside.findByRole('tablist', { name: 'Keyboard sections' }),
		).toBeVisible();

		await close(dialog);
	},
};

/**
 * A device pacing itself. Not a fault — it takes every fourth tick so the rest
 * of the group keeps its rate.
 */
export const Pacing: Story = {
	name: 'Pacing itself',
	args: {
		detail: {
			participant: '5426-0136',
			device: {
				__type: 'device',
				kind: 'mouse',
				id: '5426-0136',
				name: 'Basilisk Ultimate',
				visual: 'assets/devices/5426-0136.png',
			},
			group: { name: 'Desk', ambience: still('#ff2200'), started: true },
			status: {
				serial: '5426-0136',
				painted: true,
				achieved: {
					requested: 'normal',
					perFrameMs: 24.6,
					frames: 30,
					every: 4,
				},
			},
		},
	},
	play: async ({ canvasElement }) => {
		const dialog = await open(canvasElement);

		await expect(within(dialog).getByText(/every 4 ticks/)).toBeVisible();
		await close(dialog);
	},
};

export const Ungrouped: Story = {
	name: 'In no group',
	args: { detail: { participant: '5426-0550', device: HUNTSMAN } },
	play: async ({ canvasElement }) => {
		const dialog = await open(canvasElement);

		await expect(
			within(dialog).getByText('In no group — nothing is driving it'),
		).toBeVisible();
		await close(dialog);
	},
};

export const Skipped: Story = {
	name: 'Could not be driven',
	args: {
		detail: {
			participant: '5426-3587',
			device: {
				__type: 'device',
				kind: 'streaming',
				id: '5426-3587',
				name: 'Kiyo',
				visual: 'assets/devices/5426-3587.png',
			},
			group: { name: 'Desk', ambience: still('#00ff00'), started: true },
			skipped: { serial: '5426-3587', because: 'no lighting interface' },
		},
	},
	play: async ({ canvasElement }) => {
		const dialog = await open(canvasElement);

		await expect(
			within(dialog).getByText('no lighting interface'),
		).toBeVisible();
		await close(dialog);
	},
};

/** The dock: nothing to set on it, so no page — and no empty frame either. */
export const NoPage: Story = {
	name: 'A kind with no page',
	args: {
		detail: {
			participant: '5426-0126',
			device: {
				__type: 'device',
				kind: 'accessory',
				id: '5426-0126',
				name: 'Basilisk dock',
				visual: 'assets/devices/5426-0126.png',
			},
		},
	},
	play: async ({ canvasElement }) => {
		const dialog = await open(canvasElement);

		await expect(
			await within(dialog).findByText(/Nothing to set on this one/),
		).toBeVisible();
		await close(dialog);
	},
};
