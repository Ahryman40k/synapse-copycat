import { Component, input } from '@angular/core';
import type { Device } from '@synapse-copycat/backend-api';
import { GamingModePanel } from '../../../../core/components/gaming-mode-panel/gaming-mode-panel';
import { SnapTapPanel } from '../../../../core/components/snap-tap-panel/snap-tap-panel';
import { DeviceLayout } from '../../../../core/layout/device-layout/device-layout';

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
	/** Handed down by the page, which owns the route. */
	readonly device = input<Device | undefined>(undefined);
}
