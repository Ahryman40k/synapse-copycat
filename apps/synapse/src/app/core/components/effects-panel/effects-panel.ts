import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	model,
} from '@angular/core';
import {
	type ButtonGroupOption,
	ButtonGroup,
	CheckboxComponent,
	ColorPicker,
	Panel,
	Select,
} from '@synapse-copycat/ui';
import {
	CHROMA_EFFECT_DEFAULT,
	CHROMA_EFFECTS,
	type ChromaEffect,
} from '../../models/chroma-effect';
import {
	EFFECT_SETTINGS_DEFAULT,
	type EffectSettings,
	type WaveDirection,
	type WaveOrientation,
} from '../../models/lighting';

/**
 * The same two wave directions, drawn as whatever they mean on this device.
 *
 * OpenRazer sends one int and its three drivers read it three ways — up/down on
 * a mouse, left/right on a keyboard, anticlockwise/clockwise on an accessory.
 * The label is the accessible name, since the pill shows only the arrow.
 *
 * Path data rather than an icon font or an asset: two strokes are cheaper than
 * a dependency, and `currentColor` makes them follow the pill they sit in —
 * including the taken one, which flips to `on-primary`.
 */
const DIRECTIONS: Record<WaveOrientation, readonly ButtonGroupOption[]> = {
	vertical: [
		{ value: 'forward', label: 'Upwards', icon: 'M12 19V5M5 12l7-7 7 7' },
		{ value: 'reverse', label: 'Downwards', icon: 'M12 5v14M19 12l-7 7-7-7' },
	],
	horizontal: [
		{ value: 'forward', label: 'Leftwards', icon: 'M19 12H5M12 5l-7 7 7 7' },
		{ value: 'reverse', label: 'Rightwards', icon: 'M5 12h14M12 19l7-7-7-7' },
	],
	rotary: [
		{
			value: 'forward',
			label: 'Anticlockwise',
			icon: 'M1 4v6h6M3.51 15a9 9 0 1 0 2.13-9.36L1 10',
		},
		{
			value: 'reverse',
			label: 'Clockwise',
			icon: 'M23 4v6h-6M20.49 15a9 9 0 1 1-2.12-9.36L23 10',
		},
	],
};

/**
 * The effect a device is running, and whatever that effect needs to be one —
 * a colour, a direction, a pair of colours.
 *
 * The two belong together, and can be, because `device-layout` lays the panels
 * out as a masonry: this panel changing height as an effect is chosen now moves
 * only what is below it in its own column. On a plain grid it also pushed the
 * panel below its *neighbour*, since a row is as tall as its tallest item —
 * which is what `synMasonry` exists to undo.
 */
@Component({
	selector: 'effects-panel',
	templateUrl: './effects-panel.html',
	styleUrl: './effects-panel.scss',
	imports: [Panel, Select, CheckboxComponent, ColorPicker, ButtonGroup],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EffectsPanel {
	protected readonly effects = CHROMA_EFFECTS;

	/**
	 * What the two wave directions look like here. The section knows which
	 * device it is showing, so it is the one that says.
	 */
	readonly waveOrientation = input<WaveOrientation>('vertical');

	protected readonly directions = computed(
		() => DIRECTIONS[this.waveOrientation()],
	);

	readonly effect = model<ChromaEffect>(CHROMA_EFFECT_DEFAULT);

	/**
	 * Every effect's settings, not just the current one's, so switching to
	 * spectrum and back does not lose the colour that was picked.
	 */
	readonly settings = model<EffectSettings>(EFFECT_SETTINGS_DEFAULT);

	/**
	 * A mode, not an action: while it is on, choosing an effect here chooses it
	 * on every device. The section is what carries that out — the panel only
	 * says what was asked.
	 */
	readonly applyToAll = model(false);

	protected onEffectChange(value: string | undefined): void {
		if (value) this.effect.set(value as ChromaEffect);
	}

	protected onColorChange(color: string | undefined): void {
		// The static colour is never cleared: the picker that carries it is not
		// `clearable`, so `undefined` cannot arrive here.
		if (color) this.#patch({ color });
	}

	protected onDirectionChange(value: string | undefined): void {
		if (value === 'forward' || value === 'reverse') {
			this.#patch({ direction: value satisfies WaveDirection });
		}
	}

	protected onBreatheFirstChange(first: string | undefined): void {
		if (first) this.#patchBreathe({ first });
	}

	/** `undefined` is the point here — it means a single-colour breath. */
	protected onBreatheSecondChange(second: string | undefined): void {
		this.#patchBreathe({ second });
	}

	protected onBreatheRandomChange(random: boolean): void {
		this.#patchBreathe({ random });
	}

	#patch(patch: Partial<EffectSettings>): void {
		this.settings.update((settings) => ({ ...settings, ...patch }));
	}

	#patchBreathe(patch: Partial<EffectSettings['breathe']>): void {
		this.settings.update((settings) => ({
			...settings,
			breathe: { ...settings.breathe, ...patch },
		}));
	}
}
