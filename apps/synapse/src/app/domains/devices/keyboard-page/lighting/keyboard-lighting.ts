import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
} from '@angular/core';
import type { Device } from '@synapse-copycat/backend-api';
import { BrightnessPanelComponent } from '../../../../core/components/brightness-panel/brightness-panel';
import { EffectsPanel } from '../../../../core/components/effects-panel/effects-panel';
import { LightingSwitchOffPanelComponent } from '../../../../core/components/lighting-switch-off-panel/lighting-switch-off-panel';
import { DeviceLayout } from '../../../../core/layout/device-layout/device-layout';
import type { ChromaEffect } from '../../../../core/models/chroma-effect';
import type {
	BrightnessChange,
	EffectSettings,
} from '../../../../core/models/lighting';
import { ApplicationStore } from '../../../../core/stores/application-store';

/**
 * The lighting section of the keyboard page.
 *
 * Deliberately its own copy rather than one section shared by every device:
 * they start identical and are expected to diverge, and a component shared by
 * three pages is the awkward thing to split later. What they do share — the
 * portrait, the grid, the panels — is factored out already.
 *
 * The lighting itself lives in the store, not here. Two reasons: it has to
 * survive leaving the page, and "apply to all devices" cannot be honoured by a
 * component that only knows its own.
 */
@Component({
	selector: 'keyboard-lighting-section',
	templateUrl: './keyboard-lighting.html',
	imports: [
		DeviceLayout,
		BrightnessPanelComponent,
		LightingSwitchOffPanelComponent,
		EffectsPanel,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KeyboardLightingSection {
	readonly #store = inject(ApplicationStore);

	/**
	 * Handed down by the page, which owns the route and so owns the answer.
	 * `ngComponentOutlet` sets it, leaving the page-bar descriptor untouched.
	 */
	readonly device = input<Device | undefined>(undefined);

	protected readonly lighting = computed(() =>
		this.#store.lightingFor(this.device()?.id),
	);

	protected readonly syncEffect = this.#store.syncEffect;
	protected readonly syncBrightness = this.#store.syncBrightness;

	protected onEffectChange(effect: ChromaEffect): void {
		const id = this.device()?.id;
		if (id) this.#store.setEffect(id, effect);
	}

	/** The colours and direction the chosen effect needs; see `EffectSettings`. */
	protected onSettingsChange(settings: EffectSettings): void {
		const id = this.device()?.id;
		if (id) this.#store.setEffectSettings(id, settings);
	}

	protected onBrightnessChange(brightness: BrightnessChange): void {
		const id = this.device()?.id;
		if (id) this.#store.setBrightness(id, brightness);
	}

	protected onSyncEffectChange(enabled: boolean): void {
		const id = this.device()?.id;
		if (id) this.#store.setSyncEffect(enabled, id);
	}

	protected onSyncBrightnessChange(enabled: boolean): void {
		const id = this.device()?.id;
		if (id) this.#store.setSyncBrightness(enabled, id);
	}
}
