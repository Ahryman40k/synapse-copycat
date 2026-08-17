import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { Panel, SliderComponent } from '@synapse-copycat/ui';

/** Battery percentage below which the mouse throttles itself. */
export const LOW_POWER_THRESHOLD_DEFAULT = 30;

@Component({
	selector: 'low-power-mode-panel',
	templateUrl: './low-power-mode-panel.html',
	styleUrl: './low-power-mode-panel.scss',
	imports: [Panel, SliderComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LowPowerModePanel {
	/** Two-way, a percentage. `thresholdChange` is the change output. */
	readonly threshold = model(LOW_POWER_THRESHOLD_DEFAULT);
}
