import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { Panel, SliderComponent } from '@synapse-copycat/ui';

/** Minutes of inactivity before the mouse sleeps. */
export const SLEEP_AFTER_DEFAULT = 5;

@Component({
	selector: 'wireless-power-saving-panel',
	templateUrl: './wireless-power-saving-panel.html',
	styleUrl: './wireless-power-saving-panel.scss',
	imports: [Panel, SliderComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WirelessPowerSavingPanel {
	/** Two-way, in minutes. `sleepAfterChange` is the change output. */
	readonly sleepAfter = model(SLEEP_AFTER_DEFAULT);
}
