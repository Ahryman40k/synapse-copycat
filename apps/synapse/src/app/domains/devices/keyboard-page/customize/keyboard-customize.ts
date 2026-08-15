import { Component, inject } from '@angular/core';
import { GamingModePanel } from '../../../../core/components/gaming-mode-panel/gaming-mode-panel';
import { SnapTapPanel } from '../../../../core/components/snap-tap-panel/snap-tap-panel';
import { DeviceLayout } from '../../../../core/layout/device-layout/device-layout';
import { ApplicationStore } from '../../../../core/stores/application-store';

/**
 * Gaming mode and Snap Tap today; key remapping, macros and profiles will join
 * them here.
 */
@Component({
	selector: 'keyboard-customize-section',
	template: `
		<device-layout [device]="device()">
			<gaming-mode-panel></gaming-mode-panel>
			<snap-tap-panel></snap-tap-panel>
		</device-layout>
	`,
	imports: [DeviceLayout, GamingModePanel, SnapTapPanel],
})
export class KeyboardCustomizeSection {
	readonly #store = inject(ApplicationStore);

	protected readonly device = this.#store.currentDevice;
}
