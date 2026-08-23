import type { CapabilityResponse } from './capability';
import type { ParticipantId } from './group';
import type { Mock } from './mock';

/**
 * A shelf of Twinklys, in memory, for the browser path.
 *
 * `run_capability` writes as well as reads, so a fixed answer cannot say "set
 * a colour, then see it" — the same reason `mockGroups` exists. Each strip
 * keeps the two things the real one would: whether it is lit, and its stored
 * static colour.
 *
 * It starts lit, because a real strip usually is — it was plugged in and has
 * been playing something ever since — and a panel first seen in its off state
 * would hide the livelier half of what it has to show.
 */
export function mockTwinkly(
	strips: ParticipantId[],
	firstColour = '#ff2d95',
): Pick<Mock, 'run_capability'> {
	const lighting = new Map(
		strips.map((participant) => [
			participant,
			{ on: true, color: firstColour },
		]),
	);

	return {
		run_capability: ({ participant, request }): CapabilityResponse => {
			const strip = lighting.get(participant);
			if (!strip) {
				// The refusal the backend serialises — `BackendError` crosses the
				// IPC externally tagged. Thrown as that object, not as an
				// `Error`, for the same reason `mockGroups` refuses that way: a
				// message-shaped refusal would make the Tauri path the only one
				// where discriminating on it works.
				throw {
					DeviceNotFound: `${participant} — no sweep has seen it yet`,
				};
			}

			switch (request.type) {
				case 'TwinklySetPower':
					strip.on = request.args.on;
					return { type: 'Ok' };

				case 'TwinklySetColor':
					strip.color = request.args.color;
					return { type: 'Ok' };

				case 'TwinklyGetLighting':
					// A fresh object, like the IPC would give — nothing downstream
					// may ever see the same reference twice. See `mockGroups`.
					return { type: 'Lighting', value: { ...strip } };
			}
		},
	};
}
