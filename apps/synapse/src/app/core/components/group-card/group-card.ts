import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
} from '@angular/core';
import type {
	Ambience,
	Cadence,
	Device,
	GroupStatus,
	ParticipantId,
} from '@synapse-copycat/backend-api';
import {
	type SelectOption,
	Panel,
	Select,
	SwitchComponent,
	TextField,
} from '@synapse-copycat/ui';
import { CdkDrag, CdkDropList, type CdkDragDrop } from '@angular/cdk/drag-drop';
import { AmbiencePanel } from '../ambience-panel/ambience-panel';
import { AmbiencePreview } from '../ambience-preview/ambience-preview';
import { ParticipantCard } from '../participant-card/participant-card';

/**
 * One group: what it is showing, and who is showing it.
 *
 * The inversion the dashboard needed. Listing hardware told the user what was
 * plugged in — which they already knew — and got worse with every device added.
 * What they cannot see without being told is which of their devices honour the
 * ambience they chose, and at what rate.
 *
 * The card is also a drop target: a participant dragged onto it joins this
 * group, and the backend takes it away from whoever held it.
 */

const CADENCES: readonly SelectOption[] = [
	{ value: 'slow', label: 'Slow — 10 Hz' },
	{ value: 'normal', label: 'Normal — 30 Hz' },
	{ value: 'fast', label: 'Fast — 60 Hz' },
];

/** A participant as the card lays it out. */
type Row = {
	serial: ParticipantId;
	device?: Device;
	status?: GroupStatus['devices'][number];
	because?: string;
};

@Component({
	selector: 'group-card',
	templateUrl: './group-card.html',
	styleUrl: './group-card.scss',
	imports: [
		AmbiencePanel,
		AmbiencePreview,
		CdkDrag,
		CdkDropList,
		Panel,
		ParticipantCard,
		Select,
		SwitchComponent,
		TextField,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupCard {
	protected readonly cadences = CADENCES;

	readonly status = input.required<GroupStatus>();

	/**
	 * Everything this application knows how to describe, for the picture and
	 * the name. A participant missing from it still gets a tile — a Govee strip
	 * will be a participant long before there is a picture of one.
	 */
	readonly catalogue = input<Device[]>([]);

	/** Picked up elsewhere and waiting for somewhere to land. */
	readonly carrying = input<ParticipantId | undefined>(undefined);

	readonly ambienceChange = output<Ambience>();
	readonly startedChange = output<boolean>();
	readonly renamed = output<string>();
	readonly cadenceChange = output<Cadence>();
	readonly removed = output<void>();

	readonly participantDropped = output<ParticipantId>();
	readonly participantOpen = output<ParticipantId>();
	readonly participantPickUp = output<ParticipantId>();

	protected readonly group = computed(() => this.status().group);
	protected readonly ambience = computed(() => this.group().ambience);
	protected readonly running = computed(() => this.group().started);
	protected readonly memberCount = computed(() => this.group().members.length);

	/** The three channels in words, in the order the panel presents them. */
	protected readonly summary = computed(() => {
		const { colour, motion, brightness } = this.ambience();
		return [
			colour.type === 'fixed' ? colour.rgb : 'Rainbow',
			{ none: 'Still', wave: 'Wave', pulse: 'Pulse' }[motion.type],
			brightness.type === 'fixed'
				? `${Math.round(brightness.level * 100)}%`
				: 'Follows the hour',
		].join(' · ');
	});

	/**
	 * One row per member, whether or not anything is measuring it.
	 *
	 * Driven by `members` and not by `devices`, which is the correction the mock
	 * path forced: `devices` is empty while a group is stopped, and empty again
	 * in the browser, where the mock invents no measurements. Reading it as the
	 * participant list turned both of those into "no device answered" — a
	 * failure message for two situations that are not failures.
	 */
	protected readonly rows = computed<Row[]>(() => {
		const { group, devices, skipped } = this.status();
		const known = new Map(
			this.catalogue().map((device) => [device.id, device]),
		);

		return group.members.map((serial) => ({
			serial,
			device: known.get(serial),
			status: devices.find((device) => device.serial === serial),
			because: skipped.find((skip) => skip.serial === serial)?.because,
		}));
	});

	/** Already here, so there is nothing for this card to take. */
	protected readonly holdsCarried = computed(() => {
		const carried = this.carrying();
		return carried !== undefined && this.group().members.includes(carried);
	});

	/**
	 * Something was dropped on this group's tiles.
	 *
	 * Ignored when it came from this very list: the CDK reports a drop inside
	 * the same container too, and sending a move that changes nothing would
	 * have the backend rewrite its groups file for no reason.
	 */
	protected onDropped(event: CdkDragDrop<GroupStatus['group']['id']>): void {
		if (event.previousContainer === event.container) return;
		this.participantDropped.emit(event.item.data as ParticipantId);
	}

	protected onCadence(value: string | undefined): void {
		if (value) this.cadenceChange.emit(value as Cadence);
	}

	protected onRenamed(name: string): void {
		const trimmed = name.trim();
		// A group with no name is unnameable in the interface afterwards, and
		// the backend has no opinion — so the empty case is refused here.
		if (trimmed) this.renamed.emit(trimmed);
	}
}
