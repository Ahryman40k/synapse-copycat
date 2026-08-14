import { contrastRatio, hexToOklch, oklchToHex } from './oklch';

/**
 * Palette generation from a single source colour.
 *
 * THE RULE, and everything else follows from it:
 *
 *   The source colour contributes HUE and CHROMA only — never LIGHTNESS.
 *   Lightness always comes from the fixed tone ladder below, per role.
 *
 * Without it, a pale source washes the whole interface out: `#00ff00` sits at
 * OKLCH lightness 0.866, far too light to be legible as `primary` on a dark
 * surface. With it, contrast ratios stay within 0.1 of each other whatever
 * colour a device reports — asserted in palette.spec.ts.
 *
 * Same model as Material 3, where the source colour seeds a tonal palette
 * rather than being used raw.
 */

export type ThemeTone = 'dark' | 'light';

/** Every colour the design system exposes. Sass mirrors these names. */
export type ThemeRole =
	| 'primary-source'
	| 'primary'
	| 'primary-hover'
	| 'primary-active'
	| 'on-primary'
	| 'primary-container'
	| 'on-primary-container'
	| 'surface'
	| 'surface-container'
	| 'surface-variant'
	| 'on-surface'
	| 'on-surface-variant'
	| 'outline'
	| 'error'
	| 'on-error'
	| 'warning'
	| 'on-warning'
	| 'success'
	| 'on-success';

export type Palette = Record<ThemeRole, string>;

/**
 * How much chroma a role keeps.
 * `neutral` shades are barely tinted — that faint tint is what makes the whole
 * interface feel like the device colour rather than only the accents.
 */
type ChromaRule =
	| { kind: 'neutral'; amount: number }
	| { kind: 'source'; max: number };

type ToneSpec = { tone: number; chroma: ChromaRule };

const NEUTRAL_SUBTLE: ChromaRule = { kind: 'neutral', amount: 0.008 };
const NEUTRAL_VISIBLE: ChromaRule = { kind: 'neutral', amount: 0.016 };

/**
 * Tone ladders. Lightness is mirrored between the two tones so that a role
 * keeps its meaning: `surface` is the page, `on-surface` is text on it.
 */
/** Roles the ladder does not produce: the raw source, the semantics, and the
 * `on-*` pairs, which are measured against their background instead. */
type DerivedRole = Exclude<
	ThemeRole,
	'primary-source' | FixedRole | 'on-primary' | 'on-primary-container'
>;

const LADDERS: Record<ThemeTone, Record<DerivedRole, ToneSpec>> = {
	dark: {
		surface: { tone: 0.14, chroma: NEUTRAL_SUBTLE },
		'surface-container': { tone: 0.2, chroma: NEUTRAL_SUBTLE },
		'surface-variant': { tone: 0.26, chroma: NEUTRAL_VISIBLE },
		outline: { tone: 0.52, chroma: NEUTRAL_VISIBLE },
		'on-surface-variant': { tone: 0.76, chroma: NEUTRAL_VISIBLE },
		'on-surface': { tone: 0.92, chroma: NEUTRAL_SUBTLE },
		primary: { tone: 0.72, chroma: { kind: 'source', max: 0.2 } },
		'primary-hover': { tone: 0.78, chroma: { kind: 'source', max: 0.2 } },
		'primary-active': { tone: 0.66, chroma: { kind: 'source', max: 0.2 } },
		'primary-container': { tone: 0.34, chroma: { kind: 'source', max: 0.12 } },
	},
	light: {
		surface: { tone: 0.98, chroma: NEUTRAL_SUBTLE },
		'surface-container': { tone: 0.94, chroma: NEUTRAL_SUBTLE },
		'surface-variant': { tone: 0.89, chroma: NEUTRAL_VISIBLE },
		outline: { tone: 0.55, chroma: NEUTRAL_VISIBLE },
		'on-surface-variant': { tone: 0.42, chroma: NEUTRAL_VISIBLE },
		'on-surface': { tone: 0.18, chroma: NEUTRAL_SUBTLE },
		primary: { tone: 0.5, chroma: { kind: 'source', max: 0.2 } },
		'primary-hover': { tone: 0.44, chroma: { kind: 'source', max: 0.2 } },
		'primary-active': { tone: 0.56, chroma: { kind: 'source', max: 0.2 } },
		'primary-container': { tone: 0.9, chroma: { kind: 'source', max: 0.12 } },
	},
};

/**
 * Pick the text colour for a filled surface by measuring, not by guessing.
 *
 * Hand-tuning a lightness per role does not survive the whole hue wheel: amber
 * at the same lightness as a deep red needs dark text where the red needs
 * light. Trying both and keeping the better contrast is self-correcting, and it
 * is what makes the AA guarantee hold for any source colour.
 */
function onColourFor(background: string, hue: number): string {
	const dark = oklchToHex({ l: 0.18, c: 0.02, h: hue });
	const light = oklchToHex({ l: 0.98, c: 0.01, h: hue });

	return contrastRatio(dark, background) >= contrastRatio(light, background)
		? dark
		: light;
}

type FixedRole =
	| 'error'
	| 'on-error'
	| 'warning'
	| 'on-warning'
	| 'success'
	| 'on-success';

type SemanticName = 'error' | 'warning' | 'success';

/**
 * Semantic colours do NOT follow the device. "Error" must read as error even
 * when the mouse is lit red — recognisability beats coherence here. Only their
 * lightness moves with the theme tone.
 */
const SEMANTIC_HUE: Record<SemanticName, { c: number; h: number }> = {
	error: { c: 0.19, h: 25 },
	warning: { c: 0.16, h: 75 },
	success: { c: 0.17, h: 148 },
};

/**
 * Tones 0.55–0.62 are a dead zone: neither a dark nor a light text colour
 * reaches 4.5:1 against a saturated fill there. These sit clear of it.
 */
const SEMANTIC_TONE: Record<ThemeTone, number> = { dark: 0.72, light: 0.5 };

/**
 * Build the full palette from one source colour.
 *
 * `primary-source` is the ONLY role returned untouched: it is the exact colour
 * the hardware reports, and it is what the device-image glow must use. Every
 * other role is tone-mapped and is safe to put text on.
 */
export function createPalette(
	source: string,
	tone: ThemeTone = 'dark',
): Palette {
	const measured = hexToOklch(source);

	// A grey, white or black source has no meaningful hue — `atan2(0, 0)` is
	// arbitrary — and must not tint anything. Collapsing both here keeps the
	// palette identical for every achromatic source.
	const achromatic = measured.c < 0.002;
	const c = achromatic ? 0 : measured.c;
	const h = achromatic ? 0 : measured.h;

	const ladder = LADDERS[tone];

	const derived = Object.fromEntries(
		Object.entries(ladder).map(([role, spec]) => [
			role,
			oklchToHex({
				l: spec.tone,
				// Neutrals are tinted only as far as the source allows, so a grey
				// source yields genuinely grey surfaces.
				c:
					spec.chroma.kind === 'neutral'
						? Math.min(spec.chroma.amount, c)
						: Math.min(c, spec.chroma.max),
				h,
			}),
		]),
	) as Record<keyof typeof ladder, string>;

	const semantic = Object.fromEntries(
		Object.entries(SEMANTIC_HUE).flatMap(([role, spec]) => {
			const background = oklchToHex({ l: SEMANTIC_TONE[tone], ...spec });
			return [
				[role, background],
				[`on-${role}`, onColourFor(background, spec.h)],
			];
		}),
	) as Record<FixedRole, string>;

	return {
		'primary-source': source,
		...derived,
		// Measured against the filled surface they sit on, never hand-tuned.
		'on-primary': onColourFor(derived.primary, h),
		'on-primary-container': onColourFor(derived['primary-container'], h),
		...semantic,
	};
}

/** `--syn-<role>` — the contract Sass reads. */
export const cssVariableName = (role: ThemeRole): string => `--syn-${role}`;

/** Palette → the custom properties to write on an element. */
export function paletteToCustomProperties(
	palette: Palette,
): Record<string, string> {
	return Object.fromEntries(
		Object.entries(palette).map(([role, value]) => [
			cssVariableName(role as ThemeRole),
			value,
		]),
	);
}
