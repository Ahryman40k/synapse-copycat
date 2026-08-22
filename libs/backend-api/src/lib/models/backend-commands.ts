import type { Ambience } from './ambience';
import type { Device } from './device';
import type { Cadence, GroupId, GroupStatus, ParticipantId } from './group';
import type { Module } from './module';

export type BackendCommands = {
	devices: {
		args: Record<string, never>;
		options: Record<string, never>;
		returnType: {
			/**
			 * ⚠️ **The identifier, and the one the rest of the backend uses.**
			 * Groups name their members by serial, and `unassigned_participants`
			 * answers in serials — so anything keyed on something else can never
			 * match them.
			 *
			 * This field was in the Rust answer from the start and missing from
			 * this declaration, so the store built an id out of
			 * `vendor_id-product_id` instead. In the browser that worked,
			 * because the mock invented both halves and they agreed. Against a
			 * real daemon nothing matched: every tile showed a raw serial
			 * instead of a name and had no picture. Exactly the drift the mock
			 * is supposed to prevent and instead hid.
			 */
			serial: string;
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

	/**
	 * Twinklys found on the local network.
	 *
	 * ⚠️ A sweep, not a cached list, so this takes a couple of seconds. Call it
	 * when the interface can afford to wait — not after every group command.
	 *
	 * `participant` is keyed by MAC, so a device that takes a new lease
	 * overnight is still the same participant. `leds` is 0 and the strings are
	 * empty for a device that answered discovery but not HTTP: it exists and
	 * saying nothing about it would look like it had been missed.
	 */
	twinkly_devices: {
		args: Record<string, never>;
		options: Record<string, never>;
		returnType: {
			participant: string;
			name: string;
			address: string;
			product_code: string;
			leds: number;
			profile: string;
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
