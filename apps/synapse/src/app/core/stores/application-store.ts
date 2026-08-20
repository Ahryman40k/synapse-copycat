import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import {
	BackendApi,
	type Device,
	type Module,
} from '@synapse-copycat/backend-api';
import type { ChromaEffect } from '../models/chroma-effect';
import { type Language, LANGUAGE_DEFAULT } from '../models/language';
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
	devices: Device[];
	modules: Module[];

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
};

/**
 * Exported so a test or a story can start from it and override a field or two.
 * Rebuilding the whole object by hand means every field added here breaks them
 * — which it did, three times, always found by the Storybook build rather than
 * by `tsc`, since stories are in no tsconfig.
 */
export const INITIAL_STATE: ApplicationState = {
	devices: [],
	modules: [],
	lighting: {},
	syncEffect: false,
	syncBrightness: false,
	activeSection: {},
	language: LANGUAGE_DEFAULT,
};

export const ApplicationStore = signalStore(
	{ providedIn: 'root' },

	withState<ApplicationState>(INITIAL_STATE),

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

		async getDevices(): Promise<Device[]> {
			const result = await backendApi.invoke('devices', {});

			const devices = result.map((r) => {
				const vendorId = r.vendor_id.toString().padStart(4, '0');
				const productId = r.product_id.toString().padStart(4, '0');

				return {
					__type: 'device',
					kind: r.kind,
					id: `${vendorId}-${productId}`,
					name: r.name,
					visual: `assets/devices/${vendorId}-${productId}.png`,
				} satisfies Device;
			}); // TODO: write wrapper here + validator

			patchState(store, { devices });
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
