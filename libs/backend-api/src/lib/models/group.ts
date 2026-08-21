import {
	array,
	boolean,
	type InferOutput,
	literal,
	number,
	object,
	picklist,
	safeParse,
	string,
	union,
} from 'valibot';
import { Ambience } from './ambience';

/**
 * Groups: who shows which ambience.
 *
 * The mirror of `razer::engine::group` on the Rust side. A group is a set of
 * participants and one ambience across them; a participant belongs to at most
 * one group, because two engines painting one device would each keep undoing
 * the other.
 */

/**
 * A participant's identifier.
 *
 * Opaque on purpose. Every one is an OpenRazer serial today, and a Govee strip
 * or a Hue bulb will need something that is not — nothing here may read it.
 */
export const ParticipantId = string();
export type ParticipantId = InferOutput<typeof ParticipantId>;

export const GroupId = number();
export type GroupId = InferOutput<typeof GroupId>;

/**
 * How often a group redraws. A request, not a promise — a device that cannot
 * afford it skips ticks of its own accord rather than slowing the group.
 */
export const Cadence = picklist(['slow', 'normal', 'fast']);
export type Cadence = InferOutput<typeof Cadence>;

/** A group at rest: what it is, not what it is doing. */
export const Group = object({
	id: GroupId,
	name: string(),
	members: array(ParticipantId),
	ambience: Ambience,
	cadence: Cadence,
	/** Whether it should be drawing. Survives a restart. */
	started: boolean(),
});
export type Group = InferOutput<typeof Group>;

/** What a second of drawing actually cost one device. */
export const Achieved = object({
	requested: Cadence,
	/** Mean milliseconds to draw one frame, sending only the rows that moved. */
	perFrameMs: number(),
	/** 0 until a second has passed, which is how "not measured yet" reads. */
	frames: number(),
	/** Ticks between draws. 1 is every tick; more means the device is pacing. */
	every: number(),
});
export type Achieved = InferOutput<typeof Achieved>;

export const DeviceStatus = object({
	serial: ParticipantId,
	/**
	 * False where the ambience is approximated rather than drawn — a headset
	 * with no matrix, or a mousemat that is one single LED. Not a failure: the
	 * only thing those can show is one averaged colour.
	 */
	painted: boolean(),
	achieved: Achieved,
});
export type DeviceStatus = InferOutput<typeof DeviceStatus>;

/** A participant the engine could not take on, and why. */
export const Skipped = object({
	serial: ParticipantId,
	because: string(),
});
export type Skipped = InferOutput<typeof Skipped>;

export const GroupStatus = object({
	group: Group,
	/** Empty when the group is not running. */
	devices: array(DeviceStatus),
	skipped: array(Skipped),
});
export type GroupStatus = InferOutput<typeof GroupStatus>;

/**
 * Why a group command refused.
 *
 * Tagged by `kind`, mirroring the Rust enum. `alreadyTaken` names the group
 * that holds the participant, so the interface can offer to move it rather
 * than only saying no.
 */
export const GroupError = union([
	object({ kind: literal('unknownGroup'), id: GroupId }),
	object({
		kind: literal('alreadyTaken'),
		participant: ParticipantId,
		by: GroupId,
	}),
]);
export type GroupError = InferOutput<typeof GroupError>;

/** Milliseconds per frame, as the interface shows it. */
export const perFrame = (achieved: Achieved): string =>
	achieved.frames === 0 ? '—' : `${achieved.perFrameMs.toFixed(1)} ms`;

/**
 * What a device is really redrawing at, which is not always what was asked.
 *
 * `every` is how many ticks it lets pass — a strip that cannot afford 30Hz
 * takes every fourth and runs at 7.5, while the keyboard beside it keeps 30.
 */
export const effectiveHertz = (achieved: Achieved): number => {
	const requested = { slow: 10, normal: 30, fast: 60 }[achieved.requested];
	return requested / Math.max(1, achieved.every);
};

/**
 * Why a group command did not go through.
 *
 * `GroupError` is what the backend refuses with, deliberately. `failed` is
 * everything else — a dead IPC, a panic, a mock that threw — kept apart because
 * the two deserve different words: one is a rule the user can act on, the other
 * is a fault they cannot.
 */
export type GroupProblem = GroupError | { kind: 'failed'; message: string };

/**
 * What a group command answers.
 *
 * A refusal is not an exception. `alreadyTaken` is the backend enforcing the
 * one rule that matters, and it names the group holding the participant so the
 * interface can offer to move it — a name that would have to be dug back out of
 * a message if this were thrown.
 */
export type GroupOutcome = { ok: true } | { ok: false; problem: GroupProblem };

export const refused = (problem: GroupProblem): GroupOutcome => ({
	ok: false,
	problem,
});

/**
 * Run a command and turn its rejection into an outcome.
 *
 * ⚠️ The rejected value crosses the IPC boundary, so it is **parsed**, not
 * cast: Tauri rejects with whatever the Rust side serialised, and a command
 * that panics rejects with a string. Trusting the static type here would give
 * the interface a `problem.by` that is `undefined` and a "move it to group
 * undefined" offer.
 */
export async function attempt(
	run: () => Promise<unknown>,
): Promise<GroupOutcome> {
	try {
		await run();
		return { ok: true };
	} catch (thrown) {
		const refusal = safeParse(GroupError, thrown);
		if (refusal.success) return refused(refusal.output);

		return refused({
			kind: 'failed',
			message: thrown instanceof Error ? thrown.message : String(thrown),
		});
	}
}
