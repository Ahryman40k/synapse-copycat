import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { NgComponentOutlet } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	signal,
	type Type,
} from '@angular/core';
import type {
	Ambience,
	Device,
	DeviceStatus,
	ParticipantId,
	Skipped,
} from '@synapse-copycat/backend-api';
import { effectiveHertz } from '@synapse-copycat/backend-api';
import { Button } from '@synapse-copycat/ui';

/** Everything the dialog shows, gathered by whoever opens it. */
export type DeviceDetail = {
	participant: ParticipantId;
	/** Absent for a participant this application cannot yet describe. */
	device?: Device;
	/** The group driving it, if one is. */
	group?: { name: string; ambience: Ambience; started: boolean };
	/** Absent while the group is stopped, or before the first second. */
	status?: DeviceStatus;
	skipped?: Skipped;
};

/**
 * Which page belongs to which kind.
 *
 * `accessory` has none — the dock is not something you set anything on — so the
 * dialog shows the summary alone rather than an empty frame.
 */
const PAGES: Partial<Record<Device['kind'], () => Promise<Type<unknown>>>> = {
	mouse: () =>
		import('../../../domains/devices/mouse-page/mouse-page').then(
			(m) => m.MousePageComponent,
		),
	keyboard: () =>
		import('../../../domains/devices/keyboard-page/keyboard-page').then(
			(m) => m.KeyboardPageComponent,
		),
	mousemat: () =>
		import('../../../domains/devices/mousemat-page/mousemat-page').then(
			(m) => m.MousematPageComponent,
		),
	streaming: () =>
		import('../../../domains/devices/camera-page/camera-page').then(
			(m) => m.CameraPageComponent,
		),
	strip: () =>
		import('../../../domains/devices/strip-page/strip-page').then(
			(m) => m.StripPage,
		),
};

/**
 * One device, in detail.
 *
 * ⚠️ This is where the per-device pages live now. They were routes —
 * `/device/mouse/5426-0136` — reached from an entry in the application bar
 * labelled `mouse (2)`, which is not something a reader can match to the thing
 * on their desk. A device is opened from its own tile instead, with its picture
 * and its real name, and what opens is this. The pages themselves are unchanged
 * and are rendered here through `ngComponentOutlet`; they already took their
 * device as an input, so nothing had to be rewritten to move them.
 *
 * The line above them is what no page could say: which group is driving this
 * device, and what it is achieving. That belongs to the engine, not to the
 * device, so it was nowhere before.
 *
 * ⚠️ No `role="dialog"` on this component. The CDK's container already is the
 * dialog and carries the role; declaring it here made two, and a query for the
 * dialog then found both. The accessible name goes through `ariaLabel` on the
 * config, which lands on the container.
 */
@Component({
	selector: 'device-dialog',
	templateUrl: './device-dialog.html',
	styleUrl: './device-dialog.scss',
	imports: [Button, NgComponentOutlet],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceDialog {
	readonly #ref = inject<DialogRef<void>>(DialogRef);

	protected readonly detail = inject<DeviceDetail>(DIALOG_DATA);

	protected readonly name = computed(
		() => this.detail.device?.name ?? this.detail.participant,
	);

	/**
	 * The page for this kind, fetched when the dialog opens.
	 *
	 * ⚠️ Imported rather than referenced, and that is the point. Five device
	 * pages were reachable from here by a plain import — with the key grid, the
	 * assignment editor and the camera panel's media handling behind them — so
	 * every one of them was in the first bundle, on a dashboard that shows none
	 * of it until a tile is clicked.
	 *
	 * `undefined` covers two different things and neither is an error: a kind
	 * with no page at all, and the moment before the chunk has arrived. Both
	 * show the dialog's header, which is the part worth having immediately.
	 */
	protected readonly page = signal<Type<unknown> | undefined>(undefined);

	/** True while a chunk is on its way, so the frame is not silently empty. */
	protected readonly loading = signal(false);

	constructor() {
		const load = this.detail.device?.kind
			? PAGES[this.detail.device.kind]
			: undefined;
		if (!load) return;

		this.loading.set(true);
		void load()
			.then((page) => this.page.set(page))
			.catch((error) => {
				// A chunk that will not load is worth saying out loud: the dialog
				// would otherwise sit there looking like a device with nothing to
				// set on it, which is a different thing entirely.
				console.error('[synapse] could not load the device page', error);
			})
			.finally(() => this.loading.set(false));
	}

	/** What `ngComponentOutlet` hands the page — the same input the route bound. */
	protected readonly pageInputs = computed(() => ({
		id: this.detail.device?.id,
	}));

	/**
	 * What the engine is making of it, in one line.
	 *
	 * Every branch is a real state and none of them is a fault: a stopped group
	 * measures nothing, a first second has not passed, and a device with no
	 * matrix can only show an averaged colour.
	 */
	protected readonly doing = computed(() => {
		const { group, status, skipped } = this.detail;

		if (skipped) return skipped.because;
		if (!group) return 'In no group — nothing is driving it';
		if (!group.started) return `In ${group.name}, stopped`;
		if (!status) return `In ${group.name} — not reporting`;

		const shown = status.painted ? 'the full picture' : 'one averaged colour';
		if (status.achieved.frames === 0) {
			return `In ${group.name}, showing ${shown} — measuring…`;
		}

		const hertz = effectiveHertz(status.achieved).toFixed(0);
		const pacing =
			status.achieved.every > 1 ? `, every ${status.achieved.every} ticks` : '';
		return `In ${group.name}, showing ${shown} at ${hertz} Hz${pacing}`;
	});

	protected close(): void {
		this.#ref.close();
	}
}
