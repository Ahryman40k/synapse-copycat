import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { Panel, SwitchComponent } from '@synapse-copycat/ui';

/**
 * Snap Tap: when two opposite keys are held, the last one pressed wins instead
 * of the two cancelling out.
 *
 * On or off is all it does today — the per-key bindings it will need come
 * later, which is why the state is a plain boolean rather than an object like
 * `GamingMode`. Widen it when the rest arrives.
 */
@Component({
	selector: 'snap-tap-panel',
	templateUrl: './snap-tap-panel.html',
	styleUrl: './snap-tap-panel.scss',
	imports: [Panel, SwitchComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SnapTapPanel {
	readonly activated = model(false);
}
