import { contrastRatio, hexToOklch } from './oklch';
import {
	createPalette,
	cssVariableName,
	paletteToCustomProperties,
	type ThemeTone,
} from './palette';

/** WCAG 2.1 AA floor for body text. */
const AA = 4.5;

/** Pairs that carry text and must stay legible for any source colour. */
const TEXT_PAIRS = [
	['on-surface', 'surface'],
	['on-surface-variant', 'surface'],
	['on-surface', 'surface-container'],
	// Secondary text on a raised surface — the page bar's inactive tabs. They
	// recede through this role rather than through opacity, precisely so the
	// ratio stays guaranteed.
	['on-surface-variant', 'surface-container'],
	['on-primary', 'primary'],
	['on-primary-container', 'primary-container'],
	['on-error', 'error'],
	['on-warning', 'warning'],
	['on-success', 'success'],
] as const;

/**
 * Deliberately hostile sources: a near-white, a near-black, a fully saturated
 * neon, an achromatic grey, and hues spread around the wheel. If the ladder
 * holds for these it holds for whatever a Razer device reports.
 */
const SOURCES = [
	'#00ff00', // neon green — lightness 0.87, the awkward one
	'#dc2626',
	'#1d4ed8',
	'#facc15',
	'#ffffff',
	'#000000',
	'#808080',
	'#7c3aed',
	'#06b6d4',
];

const TONES: ThemeTone[] = ['dark', 'light'];

describe('createPalette', () => {
	it('returns the source colour untouched for the glow', () => {
		// Everything else is tone-mapped; this one must match the hardware.
		expect(createPalette('#00ff00')['primary-source']).toBe('#00ff00');
	});

	it('does not use the raw source as primary', () => {
		// #00ff00 is far too light to carry text — the whole point of the ladder.
		const palette = createPalette('#00ff00');

		expect(palette.primary).not.toBe('#00ff00');
		expect(hexToOklch(palette.primary).l).toBeCloseTo(0.72, 1);
	});

	it('keeps the source hue across the chromatic roles', () => {
		const source = hexToOklch('#1d4ed8');
		const palette = createPalette('#1d4ed8');

		// Only asserted where chroma is high enough to survive 8-bit rounding —
		// at the surfaces' 0.008 chroma the hue is not recoverable from the hex.
		for (const role of ['primary', 'primary-container'] as const) {
			expect(hexToOklch(palette[role]).h).toBeCloseTo(source.h, 0);
		}
	});

	it('tints the surfaces, but only faintly', () => {
		const palette = createPalette('#dc2626');
		const chroma = hexToOklch(palette.surface).c;

		expect(chroma).toBeGreaterThan(0); // the UI reflects the device…
		expect(chroma).toBeLessThan(0.03); // …without becoming a red page
	});

	it('ignores the source lightness entirely', () => {
		// A near-white and a near-black source must yield the same surface.
		expect(createPalette('#ffffff').surface).toBe(
			createPalette('#000000').surface,
		);
	});

	it('keeps semantic colours independent of the device', () => {
		const green = createPalette('#00ff00');
		const red = createPalette('#dc2626');

		expect(green.error).toBe(red.error);
		expect(green.warning).toBe(red.warning);
		expect(green.success).toBe(red.success);
	});

	it('produces a valid hex for every role', () => {
		for (const value of Object.values(createPalette('#7c3aed'))) {
			expect(value).toMatch(/^#[0-9a-f]{6}$/);
		}
	});

	describe.each(TONES)('contrast — %s theme', (tone) => {
		it.each(SOURCES)('stays above AA for %s', (source) => {
			const palette = createPalette(source, tone);

			for (const [foreground, background] of TEXT_PAIRS) {
				const ratio = contrastRatio(palette[foreground], palette[background]);

				expect(
					ratio,
					`${foreground} on ${background} = ${ratio.toFixed(2)}:1`,
				).toBeGreaterThanOrEqual(AA);
			}
		});
	});

	it('holds contrast steadily across hues', () => {
		// The ladder — not the colour — decides lightness, so the ratio should
		// barely move between sources. This is the property the whole design
		// rests on.
		const ratios = SOURCES.map((source) => {
			const palette = createPalette(source);
			return contrastRatio(palette['on-surface'], palette.surface);
		});

		expect(Math.max(...ratios) - Math.min(...ratios)).toBeLessThan(1);
	});
});

describe('custom properties', () => {
	it('names variables as --syn-<role>', () => {
		expect(cssVariableName('on-primary')).toBe('--syn-on-primary');
	});

	it('maps every role to a variable', () => {
		const palette = createPalette('#00ff00');
		const properties = paletteToCustomProperties(palette);

		expect(Object.keys(properties)).toHaveLength(Object.keys(palette).length);
		expect(properties['--syn-primary-source']).toBe('#00ff00');
	});
});
