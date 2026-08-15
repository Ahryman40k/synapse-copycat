import { Component, input } from '@angular/core';
import type { Device } from '@synapse-copycat/backend-api';
import { DeviceLayout } from '../../../../core/layout/device-layout/device-layout';

/**
 * Not built yet — sensitivity, buttons and profiles will live here.
 *
 * It renders the layout with no panels rather than a bare word, so the mouse
 * stays on screen when the section changes, and it declares `device` because
 * the page hands one to every section it renders: an undeclared input is a
 * dev-mode error, not a no-op.
 */
@Component({
	selector: 'mouse-customize-section',
	template: '<device-layout [device]="device()"></device-layout>',
	imports: [DeviceLayout],
})
export class MouseCustomizePanelComponent {
	readonly device = input<Device | undefined>(undefined);
}
