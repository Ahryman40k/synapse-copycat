/**
 * Minimal OKLab / OKLCH colour maths.
 *
 * Hand-rolled rather than pulled from a library: it is ~80 lines, it must run
 * in the browser on every device-colour change, and the gamut mapping needs to
 * be ours (see `clampChroma`). Coefficients are Björn Ottosson's reference
 * values for OKLab.
 *
 * OKLCH is used because it is perceptually uniform: equal steps of `l` look
 * like equal steps. HSL is not — which is why a palette built by varying HSL
 * lightness alone comes out flat.
 */

export type Rgb = { r: number; g: number; b: number };

/** Lightness 0..1, chroma 0..~0.4, hue in degrees. */
export type Oklch = { l: number; c: number; h: number };

// ── sRGB ↔ linear ───────────────────────────────────────────────────────────

const toLinear = (v: number): number =>
	v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;

const toGamma = (v: number): number =>
	v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;

// ── hex ↔ rgb ───────────────────────────────────────────────────────────────

/** Accepts `#rgb` and `#rrggbb`. Returns channels in 0..1. */
export function hexToRgb(hex: string): Rgb {
	let value = hex.replace('#', '');
	if (value.length === 3) {
		value = value
			.split('')
			.map((c) => c + c)
			.join('');
	}
	const int = Number.parseInt(value, 16);
	return {
		r: ((int >> 16) & 255) / 255,
		g: ((int >> 8) & 255) / 255,
		b: (int & 255) / 255,
	};
}

export function rgbToHex({ r, g, b }: Rgb): string {
	const channel = (v: number) =>
		Math.max(0, Math.min(255, Math.round(v * 255)))
			.toString(16)
			.padStart(2, '0');
	return `#${channel(r)}${channel(g)}${channel(b)}`;
}

// ── rgb ↔ oklab ─────────────────────────────────────────────────────────────

function rgbToOklab({ r, g, b }: Rgb): [number, number, number] {
	const lr = toLinear(r);
	const lg = toLinear(g);
	const lb = toLinear(b);

	const l = Math.cbrt(
		0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb,
	);
	const m = Math.cbrt(
		0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb,
	);
	const s = Math.cbrt(
		0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb,
	);

	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
	];
}

function oklabToRgb(L: number, a: number, b: number): Rgb {
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

	return {
		r: toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
		g: toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
		b: toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
	};
}

// ── rgb ↔ oklch ─────────────────────────────────────────────────────────────

export function rgbToOklch(rgb: Rgb): Oklch {
	const [l, a, b] = rgbToOklab(rgb);
	return {
		l,
		c: Math.hypot(a, b),
		h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360,
	};
}

export function oklchToRgb({ l, c, h }: Oklch): Rgb {
	const rad = (h * Math.PI) / 180;
	return oklabToRgb(l, c * Math.cos(rad), c * Math.sin(rad));
}

export const hexToOklch = (hex: string): Oklch => rgbToOklch(hexToRgb(hex));

// ── gamut ───────────────────────────────────────────────────────────────────

const EPSILON = 1e-4;

export function isInGamut({ r, g, b }: Rgb): boolean {
	return [r, g, b].every((v) => v >= -EPSILON && v <= 1 + EPSILON);
}

/**
 * Reduce chroma until the colour fits inside sRGB, keeping lightness and hue.
 *
 * Required, not optional: at high and low lightness most hues cannot hold their
 * chroma. Without this the conversion silently clips per channel, which shifts
 * the hue instead of just dulling the colour.
 */
export function clampChroma(colour: Oklch): Oklch {
	if (isInGamut(oklchToRgb(colour))) return colour;

	let low = 0;
	let high = colour.c;
	for (let i = 0; i < 24; i++) {
		const mid = (low + high) / 2;
		if (isInGamut(oklchToRgb({ ...colour, c: mid }))) low = mid;
		else high = mid;
	}
	return { ...colour, c: low };
}

/** OKLCH → `#rrggbb`, gamut-mapped. This is the only conversion callers need. */
export const oklchToHex = (colour: Oklch): string =>
	rgbToHex(oklchToRgb(clampChroma(colour)));

// ── contrast ────────────────────────────────────────────────────────────────

function relativeLuminance({ r, g, b }: Rgb): number {
	const [lr, lg, lb] = [r, g, b].map((v) =>
		toLinear(Math.max(0, Math.min(1, v))),
	);
	return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/**
 * WCAG 2.1 contrast ratio, 1..21. The AA floor for body text is 4.5.
 * Used by the palette tests to prove the tone ladder stays legible whatever
 * colour a device reports.
 */
export function contrastRatio(a: string, b: string): number {
	const la = relativeLuminance(hexToRgb(a));
	const lb = relativeLuminance(hexToRgb(b));
	return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
