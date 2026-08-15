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
 * Lists the panels this device offers and binds them. The portrait, the grid
 * and the reflow belong to `device-layout`.
 *
 * The template carried `min="0" max="100"` on the brightness panel, which
 * declares neither: they were plain DOM attributes doing nothing.
 */
@Component({
	selector: 'mousemat-lighting-panel',
	templateUrl: './mousemat-lighting.html',
	imports: [
		DeviceLayout,
		BrightnessPanelComponent,
		LightingSwitchOffPanelComponent,
		EffectsPanel,
	],
})
export class MousematLightingPanelComponent {
	readonly #store = inject(ApplicationStore);

	/**
	 * The section is the connected half: it selects the device from the store
	 * and hands it to the template, which stays presentational.
	 */
	protected readonly device = this.#store.currentDevice;

	readonly brightness = model<BrightnessChange>({
		value: 100,
		activated: true,
	});
}
