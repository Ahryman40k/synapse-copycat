import { computed, inject } from '@angular/core';
import {
	patchState,
	signalStore,
	withComputed,
	withMethods,
	withProps,
	withState,
} from '@ngrx/signals';
import {
	BackendApi,
	type Device,
	type Module,
} from '@synapse-copycat/backend-api';
import type {
	Ambience,
	BackendEvents,
	Cadence,
	CapabilityResponse,
	GroupId,
	GroupOutcome,
	GroupStatus,
	ParticipantId,
} from '@synapse-copycat/backend-api';
import { attempt, refused } from '@synapse-copycat/backend-api';
import { safeParse } from 'valibot';
import type { ChromaEffect } from '../models/chroma-effect';
import { type Language, LANGUAGE_DEFAULT } from '../models/language';
import {
	STRIP_LIGHTING_DEFAULT,
	StripLighting,
} from '../models/strip-lighting';
import {
	type Source,
	type Sources,
	readSources,
	writeSources,
} from '../models/source';
import {
	type BrightnessChange,
	type DeviceLighting,
	DEVICE_LIGHTING_DEFAULT,
	type EffectSettings,
} from '../models/lighting';

/**
 * Writes one part of the lighting onto every target, defaulting any device not
 * in the map yet.
 *
 * Four setters were the same reduce with a different key; the shape of the
 * write is the thing worth having once.
 */
function patchLighting(
	lighting: Record<string, DeviceLighting>,
	targets: readonly string[],
	patch: Partial<DeviceLighting>,
): Record<string, DeviceLighting> {
	return targets.reduce(
		(next, id) => ({
			...next,
			[id]: { ...(next[id] ?? DEVICE_LIGHTING_DEFAULT), ...patch },
		}),
		lighting,
	);
}

/**
 * One enumerated Razer device, off the wire and into the domain.
 *
 * Module-level because two paths produce the same list — the `devices` fetch
 * and the `devices_changed` hotplug event — and a device must look identical
 * whichever way it arrived.
 */
function toDevice(wire: BackendEvents['devices_changed'][number]): Device {
	const vendorId = wire.vendor_id.toString().padStart(4, '0');
	const productId = wire.product_id.toString().padStart(4, '0');

	return {
		__type: 'device',
		kind: wire.kind,
		// ⚠️ The serial, because that is what the rest of the backend names a
		// participant by. Built from `vendor-product` this matched nothing
		// against a real daemon, and every tile in a group showed a raw serial
		// with no picture.
		id: wire.serial,
		name: wire.name,
		// The picture is per model, so it stays keyed on the ids that identify
		// a model rather than a unit. A model with no picture in the repository
		// simply has none — the card drops an image it cannot load rather than
		// showing it broken.
		visual: `assets/devices/${vendorId}-${productId}.png`,
	} satisfies Device;
}

/** One found strip — same rule, shared by the sweep and the watch event. */
function toStrip(
	wire: BackendEvents['twinkly_devices_changed'][number],
): Device {
	return {
		__type: 'device',
		kind: 'strip',
		// The backend's identifier, taken as it is: it is keyed by MAC so it
		// survives a change of address, and nothing here may read it to work
		// out what it is.
		id: wire.participant,
		name: wire.name,
		visual: 'assets/modules/twinkly.png',
	} satisfies Device;
}

/**
 * At most one write per key on the wire, and only the newest one waiting.
 *
 * For the strips: the colour picker applies live while it is open, so a drag
 * is dozens of changes a second, each of which would be an HTTP round trip to
 * a device with a three-second timeout. Sending them all queues seconds of
 * stale colours behind the newest; keeping only the latest means the strip is
 * never more than one write behind the hand. One queue per participant also
 * keeps a power flip and a colour change in the order they were made.
 *
 * A failed write is logged and dropped — the strip keeps what it had, and the
 * next read reports the truth.
 */
class LatestWins {
	readonly #next = new Map<string, () => Promise<unknown>>();
	readonly #busy = new Set<string>();

	push(key: string, send: () => Promise<unknown>): void {
		this.#next.set(key, send);
		if (!this.#busy.has(key)) void this.#drain(key);
	}

	async #drain(key: string): Promise<void> {
		this.#busy.add(key);
		try {
			for (let send = this.#next.get(key); send; send = this.#next.get(key)) {
				this.#next.delete(key);
				try {
					await send();
				} catch (error) {
					console.warn(`a write to ${key} failed`, error);
				}
			}
		} finally {
			this.#busy.delete(key);
		}
	}
}

export type ApplicationState = {
	/** What the Razer backend enumerated, over DBus. */
	wired: Device[];
	modules: Module[];

	/**
	 * The groups, as the backend last reported them.
	 *
	 * Read, never edited here: the backend owns them and writes every change to
	 * disk before answering, so re-reading after a command is what keeps this
	 * honest. Patching locally would let the two drift with nothing to say so.
	 */
	groups: GroupStatus[];

	/**
	 * Participants no group has claimed, as the backend counts them.
	 *
	 * ⚠️ Razer devices only. Anything found over the network is in
	 * `discovered`, because asking the backend would mean a two-second sweep
	 * on every group command. The two are joined by `unassigned`.
	 */
	claimable: ParticipantId[];

	/**
	 * Found on the network — Twinklys today.
	 *
	 * Held apart from `wired` and merged by the `devices` selector, so a
	 * refresh of one never drops the other: the two arrive from different
	 * commands, seconds apart.
	 */
	discovered: Device[];

	/**
	 * The lighting of each device, by id. A device absent from the map is on
	 * its defaults, which is why it starts empty rather than pre-filled.
	 */
	lighting: Record<string, DeviceLighting>;

	/**
	 * What each strip reported it is doing, by participant.
	 *
	 * Apart from `lighting` because it is a different kind of fact: `lighting`
	 * is what the user chose here, this is what the device *said* — read over
	 * the network when its panel opens, written back as the controls move.
	 */
	stripLighting: Record<string, StripLighting>;

	/**
	 * Whether a choice made on one device is made on all of them.
	 *
	 * Here rather than in the panels because it is not a property of a panel or
	 * of a device: it says how *every* device relates to the others, and it has
	 * to survive walking from one device page to the next.
	 *
	 * Two flags, not one. Wanting a single effect everywhere without a single
	 * brightness everywhere is ordinary — a keyboard under the eyes is usually
	 * dimmer than a mousemat beside them.
	 */
	syncEffect: boolean;
	syncBrightness: boolean;

	/**
	 * Which section of each device page was last open, by device id.
	 *
	 * Here rather than in the page because the page is destroyed on the way
	 * out: walking to another device and back would otherwise always land on
	 * the first tab, however long you had spent on another.
	 */
	activeSection: Record<string, string>;

	/** What the interface speaks. Recorded, not yet acted on. */
	language: Language;

	/** Which protocols are looked for at all. */
	sources: Sources;
};

/**
 * Exported so a test or a story can start from it and override a field or two.
 * Rebuilding the whole object by hand means every field added here breaks them
 * — which it did, three times, always found by the Storybook build rather than
 * by `tsc`, since stories are in no tsconfig.
 */
export const INITIAL_STATE: ApplicationState = {
	wired: [],
	modules: [],
	groups: [],
	claimable: [],
	discovered: [],
	lighting: {},
	stripLighting: {},
	syncEffect: false,
	syncBrightness: false,
	activeSection: {},
	language: LANGUAGE_DEFAULT,
	// Read at module load rather than in a method: the resolvers ask for
	// devices before anything has had a chance to call an initialiser, and a
	// sweep skipped by a preference must be skipped on the very first one.
	sources: readSources(
		typeof localStorage === 'undefined' ? undefined : localStorage,
	),
};

export const ApplicationStore = signalStore(
	{ providedIn: 'root' },

	withState<ApplicationState>(INITIAL_STATE),

	withComputed((store) => ({
		/**
		 * Every device, whatever it arrived over.
		 *
		 * A single list on purpose: the interface must not have to know that a
		 * keyboard came over DBus and a light string over UDP. Everything that
		 * reads this — the dashboard tiles, the detail dialog, the group cards
		 * — treats them alike, which is what makes adding Govee a matter of one
		 * more source rather than one more branch everywhere.
		 */
		devices: computed(() => [...store.wired(), ...store.discovered()]),

		/**
		 * Participants no group holds.
		 *
		 * The backend answers for the ones it drives; discovery answers for the
		 * ones it has merely found. Joining them here rather than in the
		 * backend keeps `unassigned_participants` quick — it is re-read after
		 * every group command, and a network sweep there would put two seconds
		 * on each of them.
		 *
		 * ⚠️ A discovered device dropped into a group is driven for real — the
		 * engine streams to a Twinkly over UDP — but only once a sweep has
		 * found its address. A saved group restarted before the first sweep
		 * reports the strip as skipped until it is started again.
		 */
		unassigned: computed(() => {
			const held = new Set(
				store.groups().flatMap((status) => status.group.members),
			);

			return [
				...store.claimable(),
				...store
					.discovered()
					.map((device) => device.id)
					.filter((id) => !held.has(id)),
			];
		}),
	})),

	// One write queue per store instance — a test's fresh store must not
	// inherit another's backlog. The `_` prefix keeps it off the public type.
	withProps(() => ({ _stripWrites: new LatestWins() })),

	withMethods((store, backendApi = inject(BackendApi)) => ({
		/**
		 * The selector a device page uses to turn its `:id` route segment into
		 * the device it is about.
		 *
		 * Called inside a `computed` it stays reactive — it reads `devices`, so
		 * the page follows the store filling up. The page then hands the result
		 * down to its sections instead of each deriving its own: one answer per
		 * page, and they cannot disagree.
		 */
		deviceById(id: string | undefined): Device | undefined {
			return store.devices().find((device) => device.id === id);
		},

		/**
		 * Turn a protocol's discovery on or off.
		 *
		 * Saved immediately. The cost of getting it wrong is a network sweep the
		 * user asked not to happen, and a preference that forgets itself on
		 * every launch is not a preference.
		 */
		setSource(source: Source, enabled: boolean): void {
			const sources = { ...store.sources(), [source]: enabled };
			patchState(store, { sources });
			writeSources(
				typeof localStorage === 'undefined' ? undefined : localStorage,
				sources,
			);

			// The backend half of the Twinkly switch: the poller sweeping the
			// network. Fire and forget — the preference itself is already
			// saved, and a failed toggle corrects itself at the next launch.
			if (source === 'twinkly') {
				void backendApi.invoke('watch_twinkly', { enabled });
			}
		},

		setLanguage(language: Language): void {
			patchState(store, { language });
		},

		// ── sections ──────────────────────────────────────────────────────────

		/** Undefined for a device never opened, which lands on the first tab. */
		sectionFor(deviceId: string | undefined): string | undefined {
			if (!deviceId) return undefined;
			return store.activeSection()[deviceId];
		},

		setSection(deviceId: string, title: string): void {
			patchState(store, (state) => ({
				activeSection: { ...state.activeSection, [deviceId]: title },
			}));
		},

		// ── lighting ──────────────────────────────────────────────────────────

		/** Whatever this device is set to, or the defaults if never touched. */
		lightingFor(deviceId: string | undefined): DeviceLighting {
			if (!deviceId) return DEVICE_LIGHTING_DEFAULT;
			return store.lighting()[deviceId] ?? DEVICE_LIGHTING_DEFAULT;
		},

		/**
		 * ⚠️ Every device, not every *chroma* device. Nothing reports which ones
		 * light up: that is the capability list OpenRazer publishes over DBus
		 * and which the contract does not carry yet. The filter belongs here the
		 * day it does.
		 */
		setEffect(deviceId: string, effect: ChromaEffect): void {
			const targets = store.syncEffect()
				? store.devices().map((device) => device.id)
				: [deviceId];

			patchState(store, (state) => ({
				lighting: patchLighting(state.lighting, targets, { effect }),
			}));
		},

		/**
		 * The colours and the direction an effect needs, on the same rule as the
		 * effect itself: choosing green for one device with the box ticked means
		 * choosing it for all of them. A settings change that did not follow the
		 * effect would leave the devices agreeing on `static` and disagreeing on
		 * what colour that is.
		 */
		setEffectSettings(deviceId: string, settings: EffectSettings): void {
			const targets = store.syncEffect()
				? store.devices().map((device) => device.id)
				: [deviceId];

			patchState(store, (state) => ({
				lighting: patchLighting(state.lighting, targets, { settings }),
			}));
		},

		setBrightness(deviceId: string, brightness: BrightnessChange): void {
			const targets = store.syncBrightness()
				? store.devices().map((device) => device.id)
				: [deviceId];

			patchState(store, (state) => ({
				lighting: patchLighting(state.lighting, targets, { brightness }),
			}));
		},

		/**
		 * Record the flag, then write this device's value back through whichever
		 * rule now applies. Turning it on therefore aligns the others straight
		 * away — waiting for the next change would leave the box ticked over
		 * devices that disagree, claiming a state that is not true.
		 *
		 * Turning it off needs no guard: `setEffect` then targets the reference
		 * alone, and it already holds that value, so the call settles to
		 * nothing. One path, both directions.
		 *
		 * The reference is required. The tick always comes from a panel, and a
		 * panel always knows which device it is showing.
		 */
		setSyncEffect(enabled: boolean, referenceId: string): void {
			patchState(store, { syncEffect: enabled });

			const reference = this.lightingFor(referenceId);
			this.setEffect(referenceId, reference.effect);
			this.setEffectSettings(referenceId, reference.settings);
		},

		setSyncBrightness(enabled: boolean, referenceId: string): void {
			patchState(store, { syncBrightness: enabled });
			this.setBrightness(referenceId, this.lightingFor(referenceId).brightness);
		},

		// ── strips ────────────────────────────────────────────────────────────
		//
		// Unlike the Razer lighting above, these write to the device: a strip
		// is not driven by the engine, so what its panel sets goes straight
		// over `run_capability` and what the panel shows was read back from it.

		/** What the strip last reported, or dark-by-default before it has. */
		stripLightingFor(deviceId: string | undefined): StripLighting {
			if (!deviceId) return STRIP_LIGHTING_DEFAULT;
			return store.stripLighting()[deviceId] ?? STRIP_LIGHTING_DEFAULT;
		},

		/**
		 * Ask the strip what it is doing, so its panel opens telling the truth
		 * rather than assuming its own last write.
		 *
		 * Parsed before it is believed (root AGENTS.md §6) — the colour lands
		 * in a native `<input type="color">`, which reads anything but
		 * `#rrggbb` as black without a word. A strip that cannot answer, or
		 * answers in a shape this build does not read, simply keeps showing
		 * the default: worth a warning, not a broken panel.
		 */
		async getStripLighting(id: ParticipantId): Promise<void> {
			let answer: CapabilityResponse;
			try {
				answer = await backendApi.invoke('run_capability', {
					participant: id,
					request: { type: 'TwinklyGetLighting' },
				});
			} catch (error) {
				console.warn(`could not read what ${id} is showing`, error);
				return;
			}

			const parsed = safeParse(
				StripLighting,
				answer.type === 'Lighting' ? answer.value : undefined,
			);
			if (!parsed.success) {
				console.warn(`${id} answered in an unexpected shape`, answer);
				return;
			}

			patchState(store, (state) => ({
				stripLighting: { ...state.stripLighting, [id]: parsed.output },
			}));
		},

		/**
		 * Light the strip with its stored colour, or turn it dark.
		 *
		 * The store is patched before the wire answers: the switch belongs to
		 * the hand that flipped it, and snapping back while a slow device
		 * thinks reads as refusal. A write that fails is logged by the queue
		 * and the next read reports what is actually true.
		 */
		setStripPower(id: ParticipantId, on: boolean): void {
			patchState(store, (state) => ({
				stripLighting: {
					...state.stripLighting,
					[id]: { ...this.stripLightingFor(id), on },
				},
			}));
			store._stripWrites.push(id, () =>
				backendApi.invoke('run_capability', {
					participant: id,
					request: { type: 'TwinklySetPower', args: { on } },
				}),
			);
		},

		/**
		 * Store a static colour on the strip — shown at once if it is lit.
		 *
		 * Through the queue, because the picker fires continuously while a
		 * colour is being dragged; see `LatestWins` for why sending them all
		 * would be worse than skipping to the newest.
		 */
		setStripColor(id: ParticipantId, color: string): void {
			patchState(store, (state) => ({
				stripLighting: {
					...state.stripLighting,
					[id]: { ...this.stripLightingFor(id), color },
				},
			}));
			store._stripWrites.push(id, () =>
				backendApi.invoke('run_capability', {
					participant: id,
					request: { type: 'TwinklySetColor', args: { color } },
				}),
			);
		},

		// ── groups ────────────────────────────────────────────────────────────
		//
		// Two rules hold across all of these.
		//
		// They re-read afterwards rather than patching state from what they just
		// sent: the backend may adjust what it was given, and it is the only one
		// that knows what the groups are once another window has had its say.
		//
		// And they answer with a `GroupOutcome` rather than throwing. A refusal
		// is not an exception here — `alreadyTaken` is the backend enforcing the
		// one rule that matters, and it names the group holding the participant
		// precisely so the interface can offer to move it. Thrown, that name
		// would have to be dug back out of an error message.

		/**
		 * Read the groups, and who is unclaimed.
		 *
		 * ⚠️ **Two independent answers, read independently.** They were a single
		 * `Promise.all`, and one refusal took the other down with it: on a
		 * machine with a light string and no Razer hardware,
		 * `unassigned_participants` refused because there was no daemon to
		 * list, so the groups never arrived either. The dashboard showed none,
		 * and every group command appeared to do nothing — because each one
		 * re-reads through here, and the re-read threw.
		 *
		 * The backend no longer refuses that particular question, and this no
		 * longer lets one answer bury another. Both were wrong; either alone
		 * would have hidden the other.
		 */
		async getGroups(): Promise<GroupStatus[]> {
			const [groups, claimable] = await Promise.allSettled([
				backendApi.invoke('groups', {}),
				backendApi.invoke('unassigned_participants', {}),
			]);

			if (groups.status === 'fulfilled') {
				patchState(store, { groups: groups.value });
			} else {
				console.warn('[synapse] could not read the groups', groups.reason);
			}

			if (claimable.status === 'fulfilled') {
				patchState(store, { claimable: claimable.value });
			} else {
				// Not fatal, and not silent: the tray will be short of whatever
				// the backend could not enumerate, and the groups above are
				// still worth showing.
				console.warn(
					'[synapse] could not read the unclaimed participants',
					claimable.reason,
				);
			}

			return store.groups();
		},

		async createGroup(
			name: string,
			members: ParticipantId[],
			ambience: Ambience,
		): Promise<GroupOutcome> {
			const outcome = await attempt(() =>
				backendApi.invoke('create_group', { name, members, ambience }),
			);
			await this.getGroups();
			return outcome;
		},

		async renameGroup(id: GroupId, name: string): Promise<GroupOutcome> {
			const outcome = await attempt(() =>
				backendApi.invoke('rename_group', { id, name }),
			);
			await this.getGroups();
			return outcome;
		},

		async setGroupMembers(
			id: GroupId,
			members: ParticipantId[],
		): Promise<GroupOutcome> {
			const outcome = await attempt(() =>
				backendApi.invoke('set_group_members', { id, members }),
			);
			await this.getGroups();
			return outcome;
		},

		async setGroupAmbience(
			id: GroupId,
			ambience: Ambience,
		): Promise<GroupOutcome> {
			const outcome = await attempt(() =>
				backendApi.invoke('set_group_ambience', { id, ambience }),
			);
			await this.getGroups();
			return outcome;
		},

		/**
		 * How often the group redraws.
		 *
		 * A request, not a promise: a device that cannot afford the rate skips
		 * ticks of its own accord rather than slowing the group, which is what
		 * the achieved figures on each participant are there to show.
		 */
		async setGroupCadence(
			id: GroupId,
			cadence: Cadence,
		): Promise<GroupOutcome> {
			const outcome = await attempt(() =>
				backendApi.invoke('set_group_cadence', { id, cadence }),
			);
			await this.getGroups();
			return outcome;
		},

		async startGroup(id: GroupId): Promise<GroupOutcome> {
			const outcome = await attempt(() =>
				backendApi.invoke('start_group', { id }),
			);
			await this.getGroups();
			return outcome;
		},

		async stopGroup(id: GroupId): Promise<GroupOutcome> {
			const outcome = await attempt(() =>
				backendApi.invoke('stop_group', { id }),
			);
			await this.getGroups();
			return outcome;
		},

		async removeGroup(id: GroupId): Promise<GroupOutcome> {
			const outcome = await attempt(() =>
				backendApi.invoke('remove_group', { id }),
			);
			await this.getGroups();
			return outcome;
		},

		/**
		 * Hand a participant from whichever group holds it to another one.
		 *
		 * Two commands, in this order, because the backend refuses the second
		 * while the first still holds it — that refusal is the rule doing its
		 * job, not something to work around. Releasing first means a participant
		 * can be briefly ungrouped, which is a state the model already has and
		 * the engine handles by not drawing it.
		 *
		 * The holder is read from the store rather than taken as an argument:
		 * the caller sees a label saying "in Desk", and having it pass that back
		 * would let a stale reading send the wrong group a member list.
		 */
		async moveParticipant(
			participant: ParticipantId,
			to: GroupId,
		): Promise<GroupOutcome> {
			// Looked up before anything is released: getting this the other way
			// round left the participant in no group when the destination turned
			// out not to exist — a release that cannot be undone by a command
			// that was never going to work.
			const target = store.groups().find((status) => status.group.id === to);
			if (!target) return refused({ kind: 'unknownGroup', id: to });

			const holder = store
				.groups()
				.find((status) => status.group.members.includes(participant))?.group;

			// Dropped back where it already is. Nothing to do, and worth saying
			// so: the backend writes its groups to disk on every change, so a
			// no-op command is a file rewritten for nothing.
			if (holder?.id === to) return { ok: true };

			if (holder) {
				const released = await this.setGroupMembers(
					holder.id,
					holder.members.filter((member) => member !== participant),
				);
				// Stop if the release failed: adding it elsewhere would then be
				// refused anyway, and reporting that second refusal would name
				// the wrong cause.
				if (!released.ok) return released;
			}

			return this.setGroupMembers(target.group.id, [
				...target.group.members.filter((member) => member !== participant),
				participant,
			]);
		},

		/**
		 * Sweep the network for Twinklys.
		 *
		 * ⚠️ Seconds, not milliseconds — it is a sweep of the whole subnet. Kept
		 * out of `getGroups`, which runs after every group command and must
		 * stay quick.
		 */
		async getDiscovered(): Promise<Device[]> {
			// Asked before the call, not filtered after: the point of the switch
			// is that the sweep does not happen.
			if (!store.sources().twinkly) {
				patchState(store, { discovered: [] });
				return [];
			}

			const found = await backendApi.invoke('twinkly_devices', {});

			const discovered = found.map(toStrip);

			patchState(store, { discovered });
			return discovered;
		},

		async getDevices(): Promise<Device[]> {
			if (!store.sources().chroma) {
				patchState(store, { wired: [] });
				return [];
			}

			const result = await backendApi.invoke('devices', {});

			const devices = result.map(toDevice); // TODO: write wrapper here + validator

			patchState(store, { wired: devices });
			return devices;
		},

		/**
		 * Follow the backend's pushes, so plug and unplug reach the screen
		 * without a reload. Called once at bootstrap.
		 *
		 * The Twinkly watch is asserted here from the saved preference: the
		 * backend must not sweep a network it was asked to leave alone, and it
		 * cannot read this interface's localStorage itself.
		 */
		async watchForChanges(): Promise<void> {
			await backendApi.invoke('watch_twinkly', {
				enabled: store.sources().twinkly,
			});

			await backendApi.listen('devices_changed', (found) => {
				// The switch silences the events too: off means off, not "off
				// until something is plugged in".
				if (!store.sources().chroma) return;
				patchState(store, { wired: found.map(toDevice) });
				// Membership bookkeeping follows the list: a device that
				// arrived is claimable, one that left no longer is.
				void this.getGroups();
			});

			await backendApi.listen('twinkly_devices_changed', (found) => {
				if (!store.sources().twinkly) return;
				patchState(store, { discovered: found.map(toStrip) });
			});
		},
		async getModules(): Promise<Module[]> {
			const result = await backendApi.invoke('modules', {});

			// TODO: add wrapper and validator
			const modules = result.map(
				(r) =>
					({
						__type: 'module',
						name: r.name,
						kind: r.kind,
						visual: `assets/modules/${r.kind}.png`,
					}) satisfies Module,
			);
			patchState(store, { modules });
			return modules;
		},
	})),
);
export type ApplicationStore = InstanceType<typeof ApplicationStore>;
