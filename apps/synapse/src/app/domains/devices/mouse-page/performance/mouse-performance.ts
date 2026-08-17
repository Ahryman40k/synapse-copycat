import { Component, input, model } from '@angular/core';
import type { Device } from '@synapse-copycat/backend-api';
import {
	type Sensitivity,
	SENSITIVITY_DEFAULT,
	SensitivityPanel,
} from '../../../../core/components/sensitivity-panel/sensitivity-panel';
import {
	type PollingRate,
	PollingRatePanel,
} from '../../../../core/components/polling-rate-panel/polling-rate-panel';
import { DeviceLayout } from '../../../../core/layout/device-layout/device-layout';

/** The performance section of the mouse page: how far it moves, how often. */
@Component({
	selector: 'mouse-performance-section',
	templateUrl: './mouse-performance.html',
	imports: [DeviceLayout, SensitivityPanel, PollingRatePanel],
})
export class MousePerformanceSection {
	/**
	 * Handed down by the page, which owns the route and so owns the answer.
	 * `ngComponentOutlet` sets it, leaving the page-bar descriptor untouched.
	 */
	readonly device = input<Device | undefined>(undefined);

	readonly sensitivity = model<Sensitivity>(SENSITIVITY_DEFAULT);
	readonly pollingRate = model<PollingRate>(1000);
}
