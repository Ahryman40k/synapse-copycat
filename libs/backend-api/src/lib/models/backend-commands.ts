import type { Ambience } from './ambience';
import type { Device } from './device';
import type { Cadence, GroupId, GroupStatus, ParticipantId } from './group';
import type { Module } from './module';

export type BackendCommands = {
	devices: {
		args: Record<string, never>;
		options: Record<string, never>;
		returnType: {
			kind: Device['kind'];
			vendor_id: number;
			product_id: number;
			name: string;
		}[];
	};
	modules: {
		args: Record<string, never>;
		options: Record<string, never>;
		returnType: {
			kind: Module['kind'];
			name: string;
		}[];
	};

	// ── groups ────────────────────────────────────────────────────────────────
	//
	// A group is a set of participants and one ambience across them. Every
	// change is written to disk by the backend before it answers, so what is
	// read here is always what a restart would restore.
	//
	// The names are snake_case because that is what `tauri::generate_handler!`
	// registers from the Rust function names.

	groups: {
		args: Record<string, never>;
		options: Record<string, never>;
		returnType: GroupStatus[];
	};

	/** Participants no group has claimed: not driven, and not broken. */
	unassigned_participants: {
		args: Record<string, never>;
		options: Record<string, never>;
		returnType: ParticipantId[];
	};

	create_group: {
		args: { name: string; members: ParticipantId[]; ambience: Ambience };
		options: Record<string, never>;
		returnType: GroupId;
	};

	rename_group: {
		args: { id: GroupId; name: string };
		options: Record<string, never>;
		returnType: null;
	};

	/** Rejected when a participant already belongs to another group. */
	set_group_members: {
		args: { id: GroupId; members: ParticipantId[] };
		options: Record<string, never>;
		returnType: null;
	};

	/** Takes effect at once on a running group. */
	set_group_ambience: {
		args: { id: GroupId; ambience: Ambience };
		options: Record<string, never>;
		returnType: null;
	};

	/** Applies on the next start. */
	set_group_cadence: {
		args: { id: GroupId; cadence: Cadence };
		options: Record<string, never>;
		returnType: null;
	};

	start_group: {
		args: { id: GroupId };
		options: Record<string, never>;
		returnType: null;
	};

	/** The devices keep the last frame; stopping is not going dark. */
	stop_group: {
		args: { id: GroupId };
		options: Record<string, never>;
		returnType: null;
	};

	remove_group: {
		args: { id: GroupId };
		options: Record<string, never>;
		returnType: null;
	};
};
