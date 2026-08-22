import { computed, inject } from '@angular/core';
import {
	patchState,
	signalStore,
	withComputed,
	withMethods,
	withState,
} from '@ngrx/signals';
import {
	BackendApi,
	type Device,
	type Module,
} from '@synapse-copycat/backend-api';
import type {
	Ambience,
	Cadence,
	GroupId,
	GroupOutcome,
	GroupStatus,
	ParticipantId,
} from '@synapse-copycat/backend-api';
import { attempt, refused } from '@synapse-copycat/backend-api';
import type { ChromaEffect } from '../models/chroma-effect';
import { type Language, LANGUAGE_DEFAULT } from '../models/language';
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
		 * ⚠️ A discovered device can be dropped into a group today, and the
		 * group will report it as one it could not drive. That is truthful:
		 * the engine does not speak Twinkly yet.
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

		async getGroups(): Promise<GroupStatus[]> {
			const [groups, claimable] = await Promise.all([
				backendApi.invoke('groups', {}),
				backendApi.invoke('unassigned_participants', {}),
			]);
			patchState(store, { groups, claimable });
			return groups;
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

			const discovered = found.map(
				(strip) =>
					({
						__type: 'device',
						kind: 'strip',
						// The backend's identifier, taken as it is: it is keyed
						// by MAC so it survives a change of address, and nothing
						// here may read it to work out what it is.
						id: strip.participant,
						name: strip.name,
						visual: 'assets/modules/twinkly.png',
					}) satisfies Device,
			);

			patchState(store, { discovered });
			return discovered;
		},

		async getDevices(): Promise<Device[]> {
			if (!store.sources().chroma) {
				patchState(store, { wired: [] });
				return [];
			}

			const result = await backendApi.invoke('devices', {});

			const devices = result.map((r) => {
				const vendorId = r.vendor_id.toString().padStart(4, '0');
				const productId = r.product_id.toString().padStart(4, '0');

				return {
					__type: 'device',
					kind: r.kind,
					// ⚠️ The serial, because that is what the rest of the backend
					// names a participant by. Built from `vendor-product` this
					// matched nothing against a real daemon, and every tile in a
					// group showed a raw serial with no picture.
					id: r.serial,
					name: r.name,
					// The picture is per model, so it stays keyed on the ids that
					// identify a model rather than a unit. A model with no
					// picture in the repository simply has none — the card drops
					// an image it cannot load rather than showing it broken.
					visual: `assets/devices/${vendorId}-${productId}.png`,
				} satisfies Device;
			}); // TODO: write wrapper here + validator

			patchState(store, { wired: devices });
			return devices;
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
