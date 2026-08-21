import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { NgComponentOutlet } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
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
import { CameraPageComponent } from '../../../domains/devices/camera-page/camera-page';
import { KeyboardPageComponent } from '../../../domains/devices/keyboard-page/keyboard-page';
import { MousePageComponent } from '../../../domains/devices/mouse-page/mouse-page';
import { MousematPageComponent } from '../../../domains/devices/mousemat-page/mousemat-page';

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
const PAGES: Partial<Record<Device['kind'], Type<unknown>>> = {
	mouse: MousePageComponent,
	keyboard: KeyboardPageComponent,
	mousemat: MousematPageComponent,
	streaming: CameraPageComponent,
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

	/** The page for this kind, or nothing when the kind has none. */
	protected readonly page = computed(() => {
		const kind = this.detail.device?.kind;
		return kind ? PAGES[kind] : undefined;
	});

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
