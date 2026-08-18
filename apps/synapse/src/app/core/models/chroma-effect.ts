import type { SelectOption } from '@synapse-copycat/ui';

/**
 * The chroma effects the Rust backend implements today.
 *
 * These are OpenRazer's, not ours: the DBus interface
 * `razer.device.lighting.chroma` exposes `setStatic`, `setSpectrum`, `setWave`,
 * `setBreathSingle` and `setNone`, and `src-tauri/src/razer/capabilities/
 * chroma.rs` has a capability for each. Probing a real device through OpenRGB
 * confirmed the same five and no more — the Chroma SDK claims `reactive` for
 * mice and keyboards, but no device here reports it.
 *
 * Lives beside the model rather than inside the panel: the store keeps an
 * effect per device now, and a store reading a type out of a component would
 * have the dependency the wrong way round.
 */
export type ChromaEffect = 'none' | 'static' | 'spectrum' | 'wave' | 'breathe';

export const CHROMA_EFFECT_DEFAULT: ChromaEffect = 'spectrum';

export const CHROMA_EFFECTS: readonly SelectOption[] = [
	{ value: 'none', label: 'None' },
	{ value: 'static', label: 'Static' },
	{ value: 'spectrum', label: 'Spectrum' },
	{ value: 'wave', label: 'Wave' },
	{ value: 'breathe', label: 'Breathe' },
];
