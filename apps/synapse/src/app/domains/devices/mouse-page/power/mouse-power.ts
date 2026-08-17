import { Component, input, model } from '@angular/core';
import type { Device } from '@synapse-copycat/backend-api';
import {
	LOW_POWER_THRESHOLD_DEFAULT,
	LowPowerModePanel,
} from '../../../../core/components/low-power-mode-panel/low-power-mode-panel';
import {
	SLEEP_AFTER_DEFAULT,
	WirelessPowerSavingPanel,
} from '../../../../core/components/wireless-power-saving-panel/wireless-power-saving-panel';
import { DeviceLayout } from '../../../../core/layout/device-layout/device-layout';

/**
 * The power section of the mouse page. Both settings only mean anything on a
 * wireless mouse.
 *
 * There is no `wireless` flag to test: the backend reports a *different
 * device* when the mouse is on its receiver — another product id, so another
 * page — and the dock shows up as a device of its own beside it. Whether this
 * section appears at all is therefore a question about which device is open,
 * not about a property of one. Nothing acts on that yet; the descriptor lists
 * `power` unconditionally.
 */
@Component({
	selector: 'mouse-power-section',
	templateUrl: './mouse-power.html',
	imports: [DeviceLayout, WirelessPowerSavingPanel, LowPowerModePanel],
})
export class MousePowerSection {
	/**
	 * Handed down by the page, which owns the route and so owns the answer.
	 * `ngComponentOutlet` sets it, leaving the page-bar descriptor untouched.
	 */
	readonly device = input<Device | undefined>(undefined);

	readonly sleepAfter = model(SLEEP_AFTER_DEFAULT);
	readonly lowPowerThreshold = model(LOW_POWER_THRESHOLD_DEFAULT);
}
