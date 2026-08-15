import { Component, input } from '@angular/core';
import type { Device } from '@synapse-copycat/backend-api';
import { CameraPanel } from '../../../../core/components/camera-panel/camera-panel';
import { ImagePanel } from '../../../../core/components/image-panel/image-panel';
import { DeviceLayout } from '../../../../core/layout/device-layout/device-layout';

/**
 * The camera itself on one side, the picture it produces on the other.
 */
@Component({
	selector: 'camera-customize-section',
	template: `
		<device-layout [device]="device()">
			<camera-panel [device]="device()"></camera-panel>
			<image-panel></image-panel>
		</device-layout>
	`,
	imports: [DeviceLayout, CameraPanel, ImagePanel],
})
export class CameraCustomizeSection {
	/** Handed down by the page, which owns the route. */
	readonly device = input<Device | undefined>(undefined);
}
