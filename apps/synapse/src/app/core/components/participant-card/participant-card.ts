import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
} from '@angular/core';
import type {
	Device,
	DeviceStatus,
	ParticipantId,
} from '@synapse-copycat/backend-api';
import { effectiveHertz, perFrame } from '@synapse-copycat/backend-api';
import { Card } from '@synapse-copycat/ui';

/**
 * One participant, as the tile it was on the first dashboard, plus what it is
 * making of the ambience it was given.
 *
 * The picture is what makes a group readable at a glance — a row of serial
 * numbers is not something anyone recognises their desk in. The line under it
 * is what the tile could not say before: painted or approximated, and at what
 * rate, which is the only place a device quietly running at a quarter of the
 * asked-for speed becomes visible.
 *
 * It knows nothing about dragging: the list it sits in is what makes it
 * draggable, by putting `cdkDrag` on the card from outside. A tile that
 * declared its own drag would be undraggable in any container that did not
 * happen to be a drop list.
 *
 * ⚠️ The participant may be one we know nothing about. A Govee strip will be a
 * participant long before this application can draw one, so `device` is
 * optional and the identifier is the fallback — never a blank tile.
 */
@Component({
	selector: 'participant-card',
	templateUrl: './participant-card.html',
	styleUrl: './participant-card.scss',
	imports: [Card],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParticipantCard {
	readonly participant = input.required<ParticipantId>();

	/** Absent for a participant this application cannot yet describe. */
	readonly device = input<Device | undefined>(undefined);

	/** Absent while the group is stopped, or before the first second. */
	readonly status = input<DeviceStatus | undefined>(undefined);

	/** Why the engine could not take it on, if it could not. */
	readonly because = input<string | undefined>(undefined);

	/** Picked up for a move without dragging — the keyboard path. */
	readonly carried = input(false);

	readonly open = output<void>();
	readonly pickUp = output<void>();

	protected readonly name = computed(
		() => this.device()?.name ?? this.participant(),
	);

	/**
	 * What this device is making of the ambience, in one line.
	 *
	 * "One colour" must not read as a failure: a headset has no matrix and a
	 * single-LED mousemat has nowhere to put a picture, so an averaged colour is
	 * the whole of what they can show.
	 */
	protected readonly doing = computed(() => {
		const because = this.because();
		if (because) return because;

		const status = this.status();
		if (!status) return undefined;

		const shown = status.painted ? 'full picture' : 'one colour';
		if (status.achieved.frames === 0) return `${shown} · measuring…`;

		return `${shown} · ${effectiveHertz(status.achieved).toFixed(0)} Hz · ${perFrame(status.achieved)}`;
	});
}
