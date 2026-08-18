import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { CheckboxComponent, Panel, Select } from '@synapse-copycat/ui';
import {
	CHROMA_EFFECT_DEFAULT,
	CHROMA_EFFECTS,
	type ChromaEffect,
} from '../../models/chroma-effect';

@Component({
	selector: 'effects-panel',
	templateUrl: './effects-panel.html',
	styleUrl: './effects-panel.scss',
	imports: [Panel, Select, CheckboxComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EffectsPanel {
	protected readonly effects = CHROMA_EFFECTS;

	readonly effect = model<ChromaEffect>(CHROMA_EFFECT_DEFAULT);

	/**
	 * A mode, not an action: while it is on, choosing an effect here chooses it
	 * on every device. The section is what carries that out — the panel only
	 * says what was asked.
	 */
	readonly applyToAll = model(false);

	protected onEffectChange(value: string | undefined): void {
		if (value) this.effect.set(value as ChromaEffect);
	}
}
