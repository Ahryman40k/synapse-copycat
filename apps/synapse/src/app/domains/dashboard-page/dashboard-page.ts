import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	signal,
} from '@angular/core';
import type {
	Ambience,
	Cadence,
	Device,
	GroupId,
	GroupOutcome,
	Module,
	ParticipantId,
} from '@synapse-copycat/backend-api';
import { still } from '@synapse-copycat/backend-api';
import { Button, Card, Masonry } from '@synapse-copycat/ui';
import { Dialog } from '@angular/cdk/dialog';
import {
	CdkDrag,
	CdkDropList,
	CdkDropListGroup,
	type CdkDragDrop,
} from '@angular/cdk/drag-drop';
import { NewGroupDialog } from '../../core/components/new-group-dialog/new-group-dialog';
import { GroupCard } from '../../core/components/group-card/group-card';
import { ParticipantCard } from '../../core/components/participant-card/participant-card';
import { Navigation } from '../../core/navigation/navigation';
import { ApplicationStore } from '../../core/stores/application-store';

/**
 * The dashboard, whose subject is the groups rather than the hardware.
 *
 * It used to be an inventory: one card per device, one per module. That told
 * the user what was plugged in — which they already knew — and got worse with
 * every device added. What a group shows is a decision they made: this
 * ambience, on these participants, running or not.
 *
 * The devices are still tiles, and still open their own page. They have simply
 * moved to where they mean something: inside the group driving them, or in the
 * tray of what nothing is driving yet.
 */
@Component({
	selector: 'dashboard-page',
	templateUrl: './dashboard-page.html',
	styleUrl: './dashboard-page.scss',
	imports: [
		Button,
		Card,
		CdkDrag,
		CdkDropList,
		CdkDropListGroup,
		GroupCard,
		Masonry,
		ParticipantCard,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
	readonly #store = inject(ApplicationStore);
	readonly #navigation = inject(Navigation);
	readonly #dialog = inject(Dialog);

	protected devices = this.#store.devices;
	protected modules = this.#store.modules;
	protected groups = this.#store.groups;

	/**
	 * Picked up by its handle and waiting for somewhere to go.
	 *
	 * The keyboard half of the drag: the platform offers no way to drag without
	 * a pointer, so the same move is available as pick up, then place.
	 */
	protected readonly carried = signal<ParticipantId | undefined>(undefined);

	/** What the backend last refused, in words. Cleared by the next success. */
	protected readonly problem = signal<string | undefined>(undefined);

	/**
	 * The devices no group has claimed.
	 *
	 * Derived from the backend's list of unassigned participants rather than by
	 * subtracting group members here: a participant need not be a device this
	 * application knows — a Govee strip will be one long before there is a
	 * picture of it — so the backend is the only one that can answer.
	 */
	protected readonly unassigned = computed(() => {
		const known = new Map(this.devices().map((device) => [device.id, device]));
		return this.#store
			.unassigned()
			.map((participant) => ({ participant, device: known.get(participant) }));
	});

	/**
	 * The name of what is being carried — but only while a group holds it.
	 *
	 * Gated on the holder because the tray's offer is "take it out", and
	 * offering that for something already in the tray is a button that would do
	 * nothing when pressed.
	 */
	protected readonly carriedName = computed(() => {
		const carried = this.carried();
		if (!carried) return undefined;

		const held = this.groups().some((status) =>
			status.group.members.includes(carried),
		);
		if (!held) return undefined;

		return (
			this.devices().find((device) => device.id === carried)?.name ?? carried
		);
	});

	// ── groups ──────────────────────────────────────────────────────────────

	/**
	 * Ask for a name, then make the group.
	 *
	 * The dialog answers with a name or with nothing, and nothing means
	 * cancelled. No flag is shared with it, so the two cannot end up disagreeing
	 * about whether it is showing — which is exactly what a two-way bound
	 * `open` made possible.
	 */
	protected newGroup(): void {
		const opened = this.#dialog.open<string | undefined>(NewGroupDialog, {
			panelClass: 'syn-dialog-panel',
		});

		opened.closed.subscribe(async (name) => {
			if (!name) return;

			// Empty and stopped. A group is a container first; what goes in it
			// and whether it draws are the next two decisions, and both are one
			// gesture away on the card that just appeared.
			this.#report(await this.#store.createGroup(name, [], still('#00ff00')));
		});
	}

	protected async onAmbience(id: GroupId, ambience: Ambience): Promise<void> {
		this.#report(await this.#store.setGroupAmbience(id, ambience));
	}

	protected async onStarted(id: GroupId, started: boolean): Promise<void> {
		this.#report(
			started
				? await this.#store.startGroup(id)
				: await this.#store.stopGroup(id),
		);
	}

	protected async onRenamed(id: GroupId, name: string): Promise<void> {
		this.#report(await this.#store.renameGroup(id, name));
	}

	protected async onCadence(id: GroupId, cadence: Cadence): Promise<void> {
		this.#report(await this.#store.setGroupCadence(id, cadence));
	}

	protected async onRemoved(id: GroupId): Promise<void> {
		this.#report(await this.#store.removeGroup(id));
	}

	// ── moving a participant ────────────────────────────────────────────────

	protected onPickUp(participant: ParticipantId): void {
		// A second press puts it back down, so the gesture can be abandoned.
		this.carried.update((held) =>
			held === participant ? undefined : participant,
		);
	}

	/** Dropped onto the tray: taken out of whatever held it. */
	protected onDroppedOut(event: CdkDragDrop<unknown>): void {
		if (event.previousContainer === event.container) return;
		void this.onReleased(event.item.data as ParticipantId);
	}

	protected async onDroppedInto(
		group: GroupId,
		participant: ParticipantId,
	): Promise<void> {
		this.carried.set(undefined);
		this.#report(await this.#store.moveParticipant(participant, group));
	}

	/**
	 * Dropped back into the tray: taken out of whatever held it.
	 *
	 * Not a deletion and not an error — leaving a device out is a legitimate
	 * choice, an unlit keyboard while the rest of the desk breathes.
	 */
	protected async onReleased(participant: ParticipantId): Promise<void> {
		this.carried.set(undefined);

		const holder = this.groups().find((status) =>
			status.group.members.includes(participant),
		)?.group;
		if (!holder) return;

		this.#report(
			await this.#store.setGroupMembers(
				holder.id,
				holder.members.filter((member) => member !== participant),
			),
		);
	}

	// ── the devices themselves ──────────────────────────────────────────────

	/** Same destination as the entry in the application bar. */
	protected open(device: Device | undefined): void {
		if (device) this.#navigation.open(device);
	}

	protected openModule(module: Module): void {
		this.#navigation.openModule(module);
	}

	/**
	 * Put a refusal into words, or clear the last one.
	 *
	 * `alreadyTaken` should not reach here — moving releases the holder first —
	 * but it can, when another window has changed the groups since this one
	 * last read them. So it says what happened rather than being swallowed.
	 */
	#report(outcome: GroupOutcome): void {
		if (outcome.ok) {
			this.problem.set(undefined);
			return;
		}

		const problem = outcome.problem;
		if (problem.kind === 'alreadyTaken') {
			const holder = this.groups().find(
				(status) => status.group.id === problem.by,
			)?.group;
			this.problem.set(
				`${problem.participant} is already in ${holder?.name ?? `group ${problem.by}`}.`,
			);
			return;
		}

		this.problem.set(
			problem.kind === 'unknownGroup'
				? 'That group is no longer there.'
				: problem.message,
		);
	}
}
