import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Device } from '@synapse-copycat/backend-api';
import { Masonry } from '@synapse-copycat/ui';
import { DeviceStage } from '../../components/device-stage/device-stage';

/**
 * The shape every section of a device page shares: the device portrait, then
 * the panels that act on it.
 *
 * A template in the atomic-design sense — it arranges, and knows nothing about
 * which panels it holds nor where the device came from. The panels are
 * projected, so each section lists the ones it needs and binds them itself:
 *
 *   <device-layout [device]="device()">
 *     <brightness-panel [(value)]="brightness" />
 *     <effects-panel />
 *   </device-layout>
 *
 * Adding or dropping a panel is then one line in that section, and the grid,
 * the portrait and the reflow are decided once, here.
 *
 * It injects nothing on purpose. Reading `CurrentDevice` here would have made
 * the whole application store a dependency of every test and story that shows
 * a panel; the sections are connected, the template is not.
 */
@Component({
	selector: 'device-layout',
	templateUrl: './device-layout.html',
	styleUrl: './device-layout.scss',
	imports: [DeviceStage, Masonry],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceLayout {
	readonly device = input<Device | undefined>(undefined);
}
