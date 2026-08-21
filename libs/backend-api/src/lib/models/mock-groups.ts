import { still } from './ambience';
import type { Mock } from './mock';
import type { Group, GroupError, GroupStatus, ParticipantId } from './group';

/**
 * A conductor, in memory, for the browser path.
 *
 * The group commands change things, and a table of fixed answers cannot say
 * "create one, then list it". This is the smallest thing that can: the same
 * rules as `razer::engine::group`, minus the drawing.
 *
 * It deliberately keeps **the one rule that matters** — a participant belongs
 * to at most one group — because that is what the interface has to handle
 * gracefully, and a mock that always says yes would hide every place it does
 * not.
 *
 * It does not pretend to measure anything. `devices` stays empty and no
 * `Achieved` is invented: numbers that look like measurements but are not
 * would be worse than none, and the interface has to read an unmeasured group
 * correctly anyway.
 */
export function mockGroups(
	participants: ParticipantId[],
	firstColour = '#00ff00',
): Pick<
	Mock,
	| 'groups'
	| 'unassigned_participants'
	| 'create_group'
	| 'rename_group'
	| 'set_group_members'
	| 'set_group_ambience'
	| 'set_group_cadence'
	| 'start_group'
	| 'stop_group'
	| 'remove_group'
> {
	// Mirrors the first run the backend gives a machine with nothing saved:
	// everything in one group, already drawing.
	let groups: Group[] = participants.length
		? [
				{
					id: 0,
					name: 'All devices',
					members: [...participants],
					ambience: still(firstColour),
					cadence: 'normal',
					started: true,
				},
			]
		: [];
	let nextId = groups.length;

	/**
	 * Refuse the way the backend refuses.
	 *
	 * Not `new Error(message)`: Tauri rejects with whatever the Rust side
	 * serialised, so a refusal arrives as `{ kind: 'alreadyTaken', … }` and the
	 * interface reads `by` to offer the move. A mock throwing a message would
	 * have made that path work in Tauri and nowhere else — the exact drift the
	 * mock exists to prevent.
	 */
	const refuse = (error: GroupError): never => {
		throw error;
	};

	const find = (id: number): Group => {
		const group = groups.find((candidate) => candidate.id === id);
		if (!group) refuse({ kind: 'unknownGroup', id });
		return group as Group;
	};

	/**
	 * Replace a group rather than edit it.
	 *
	 * ⚠️ Not a style preference. The real backend serialises a fresh object over
	 * the IPC on every read, so nothing downstream ever sees the same reference
	 * twice. Mutating in place here handed Angular an unchanged `Group` inside a
	 * changed `GroupStatus`, and a `computed` returning it short-circuited: the
	 * membership changed and the count beside it did not. The mock was the only
	 * thing that could produce that, which is precisely the drift it exists to
	 * keep out.
	 */
	const update = (id: number, change: Partial<Group>): null => {
		find(id); // exists?
		groups = groups.map((group) =>
			group.id === id ? { ...group, ...change } : group,
		);
		return null;
	};

	const holderOf = (participant: ParticipantId, excluding?: number) =>
		groups.find(
			(group) => group.id !== excluding && group.members.includes(participant),
		);

	const refuseIfTaken = (members: ParticipantId[], excluding?: number) => {
		for (const participant of members) {
			const holder = holderOf(participant, excluding);
			if (holder) {
				// The same refusal the backend gives, naming the group that has
				// it so the interface can offer to move it.
				refuse({ kind: 'alreadyTaken', participant, by: holder.id });
			}
		}
	};

	return {
		groups: (): GroupStatus[] =>
			groups.map((group) => ({ group, devices: [], skipped: [] })),

		unassigned_participants: (): ParticipantId[] =>
			participants.filter((participant) => !holderOf(participant)),

		create_group: ({ name, members, ambience }) => {
			refuseIfTaken(members);
			const id = nextId++;
			groups = [
				...groups,
				{ id, name, members, ambience, cadence: 'normal', started: false },
			];
			return id;
		},

		rename_group: ({ id, name }) => update(id, { name }),

		set_group_members: ({ id, members }) => {
			find(id); // exists?
			refuseIfTaken(members, id);
			return update(id, { members });
		},

		set_group_ambience: ({ id, ambience }) => update(id, { ambience }),

		set_group_cadence: ({ id, cadence }) => update(id, { cadence }),

		start_group: ({ id }) => update(id, { started: true }),

		stop_group: ({ id }) => update(id, { started: false }),

		remove_group: ({ id }) => {
			find(id); // exists?
			groups = groups.filter((group) => group.id !== id);
			return null;
		},
	};
}
