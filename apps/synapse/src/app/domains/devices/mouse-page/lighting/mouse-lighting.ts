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
 * The same three panels as the mousemat: a mouse lights up the same way. Its
 * own grid — `auto auto`, columns sized to their content — is gone with the
 * layout it now shares.
 */
@Component({
	selector: 'mouse-lighting-panel',
	templateUrl: './mouse-lighting.html',
	imports: [
		DeviceLayout,
		BrightnessPanelComponent,
		LightingSwitchOffPanelComponent,
		EffectsPanel,
	],
})
export class MouseLightingPanelComponent {
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
