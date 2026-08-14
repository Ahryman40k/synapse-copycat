import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { Panel, Select, type SelectOption } from '@synapse-copycat/ui';

/**
 * The chroma effects the Rust backend implements today.
 *
 * These are OpenRazer's, not ours: the DBus interface
 * `razer.device.lighting.chroma` exposes `setStatic`, `setSpectrum`, `setWave`,
 * `setBreathSingle` and `setNone`, and `src-tauri/src/razer/capabilities/
 * chroma.rs` has a capability for each.
 *
 * ⚠️ `reactive` is a real OpenRazer effect but has no capability on the Rust
 * side yet, so it is deliberately absent rather than offered and broken. There
 * is no `dynamic` chroma effect in OpenRazer at all.
 */
export type ChromaEffect = 'none' | 'static' | 'spectrum' | 'wave' | 'breathe';

export const CHROMA_EFFECTS: readonly SelectOption[] = [
	{ value: 'none', label: 'None' },
	{ value: 'static', label: 'Static' },
	{ value: 'spectrum', label: 'Spectrum' },
	{ value: 'wave', label: 'Wave' },
	{ value: 'breathe', label: 'Breathe' },
];

@Component({
	selector: 'effects-panel',
	templateUrl: './effects-panel.html',
	styleUrl: './effects-panel.scss',
	imports: [Panel, Select],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EffectsPanel {
	protected readonly effects = CHROMA_EFFECTS;

	/**
	 * Two-way, like the brightness panel. Nothing calls the backend yet —
	 * `run_capability` takes a request per call, which the current `Mock` shape
	 * cannot express (see libs/backend-api/AGENTS.md, gap 3).
	 */
	readonly effect = model<ChromaEffect>('spectrum');

	protected onEffectChange(value: string | undefined): void {
		if (value) this.effect.set(value as ChromaEffect);
	}
}
