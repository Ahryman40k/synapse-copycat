import { Component, inject } from '@angular/core';
import { CameraPanel } from '../../../../core/components/camera-panel/camera-panel';
import { ImagePanel } from '../../../../core/components/image-panel/image-panel';
import { DeviceLayout } from '../../../../core/layout/device-layout/device-layout';
import { ApplicationStore } from '../../../../core/stores/application-store';

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
	readonly #store = inject(ApplicationStore);

	protected readonly device = this.#store.currentDevice;
}
