import type { SelectOption } from '@synapse-copycat/ui';

/**
 * The chroma effects the Rust backend implements today.
 *
 * These are OpenRazer's, not ours: the DBus interface
 * `razer.device.lighting.chroma` exposes `setStatic`, `setSpectrum`, `setWave`
 * and `setBreathSingle`, and `src-tauri/src/razer/capabilities/chroma.rs` has a
 * capability for each.
 *
 * ⚠️ `setNone` is deliberately **not** offered, though the backend implements
 * it and OpenRazer exposes it. It puts the lighting out, which is what the
 * brightness panel's switch already does — two controls for one outcome, and
 * the one here is the worse of the pair: brightness remembers the effect and
 * brings it back, `setNone` clears it and leaves nothing to return to.
 *
 * `reactive` is a different case: OpenRazer offers it on three of the four
 * lit devices in the mock, but no Rust capability answers it yet. It belongs
 * here the day one does.
 */
export type ChromaEffect = 'static' | 'spectrum' | 'wave' | 'breathe';

export const CHROMA_EFFECT_DEFAULT: ChromaEffect = 'spectrum';

export const CHROMA_EFFECTS: readonly SelectOption[] = [
	{ value: 'static', label: 'Static' },
	{ value: 'spectrum', label: 'Spectrum' },
	{ value: 'wave', label: 'Wave' },
	{ value: 'breathe', label: 'Breathe' },
];
