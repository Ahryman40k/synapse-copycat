import {
	ChangeDetectionStrategy,
	Component,
	input,
	output,
} from '@angular/core';
import { ColorPicker, Panel, SwitchComponent } from '@synapse-copycat/ui';
import {
	STRIP_LIGHTING_DEFAULT,
	type StripLighting,
} from '../../models/strip-lighting';

/**
 * Whether a light strip is lit, and the one static colour it stores.
 *
 * An input and two outputs rather than a `model`: what the panel shows was
 * read from the device and belongs to the store — the panel only reports the
 * hand's moves, and never invents a state of its own that could disagree with
 * what the strip said.
 */
@Component({
	selector: 'strip-lighting-panel',
	templateUrl: './strip-lighting-panel.html',
	styleUrl: './strip-lighting-panel.scss',
	imports: [ColorPicker, Panel, SwitchComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StripLightingPanel {
	readonly lighting = input<StripLighting>(STRIP_LIGHTING_DEFAULT);

	/** The switch: on lights the stored colour, off goes dark. */
	readonly powerChange = output<boolean>();

	/** Always `#rrggbb` — the empty case never leaves this component. */
	readonly colorChange = output<string>();

	protected onColorChange(color: string | undefined): void {
		// The picker's output carries the cleared case even though this one is
		// not `clearable`; a strip has no "no colour" to return to.
		if (color) this.colorChange.emit(color);
	}
}
