import { Component, inject, model } from '@angular/core';
import {
	type BrightnessChange,
	BrightnessPanelComponent,
} from '../../../../core/components/brightness-panel/brightness-panel';
import { EffectsPanel } from '../../../../core/components/effects-panel/effects-panel';
import { LightingSwitchOffPanelComponent } from '../../../../core/components/lighting-switch-off-panel/lighting-switch-off-panel';
import { DeviceLayout } from '../../../../core/layout/device-layout/device-layout';
import { ApplicationStore } from '../../../../core/stores/application-store';

/**
 * The lighting section of the mouse page.
 *
 * Deliberately its own copy rather than one section shared by every device:
 * they start identical and are expected to diverge, and a component shared by
 * three pages is the awkward thing to split later. What they do share — the
 * portrait, the grid, the reflow — is `device-layout`, and the panels
 * themselves are components.
 *
 * The connected half of the pair: it selects the device from the store and
 * hands it to the template, which stays presentational.
 */
@Component({
	selector: 'mouse-lighting-section',
	templateUrl: './mouse-lighting.html',
	imports: [
		DeviceLayout,
		BrightnessPanelComponent,
		LightingSwitchOffPanelComponent,
		EffectsPanel,
	],
})
export class MouseLightingSection {
	readonly #store = inject(ApplicationStore);

	protected readonly device = this.#store.currentDevice;

	readonly brightness = model<BrightnessChange>({
		value: 100,
		activated: true,
	});
}
