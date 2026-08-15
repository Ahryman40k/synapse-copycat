import { Component, input, model } from '@angular/core';
import type { Device } from '@synapse-copycat/backend-api';
import {
	type BrightnessChange,
	BrightnessPanelComponent,
} from '../../../../core/components/brightness-panel/brightness-panel';
import { EffectsPanel } from '../../../../core/components/effects-panel/effects-panel';
import { LightingSwitchOffPanelComponent } from '../../../../core/components/lighting-switch-off-panel/lighting-switch-off-panel';
import { DeviceLayout } from '../../../../core/layout/device-layout/device-layout';

/**
 * The lighting section of the keyboard page.
 *
 * Deliberately its own copy rather than one section shared by every device:
 * they start identical and are expected to diverge, and a component shared by
 * three pages is the awkward thing to split later. What they do share — the
 * portrait, the grid, the reflow — is `device-layout`, and the panels
 * themselves are components.
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
})
export class KeyboardLightingSection {
	/**
	 * Handed down by the page, which owns the route and so owns the answer.
	 * `ngComponentOutlet` sets it, leaving the page-bar descriptor untouched —
	 * that array has to keep its identity, since the bar holds the selected tab
	 * by reference.
	 */
	readonly device = input<Device | undefined>(undefined);

	readonly brightness = model<BrightnessChange>({
		value: 100,
		activated: true,
	});
}
