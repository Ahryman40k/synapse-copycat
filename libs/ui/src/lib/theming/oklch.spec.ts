import {
	clampChroma,
	contrastRatio,
	hexToOklch,
	hexToRgb,
	isInGamut,
	oklchToHex,
	oklchToRgb,
	rgbToHex,
	rgbToOklch,
} from './oklch';

describe('oklch', () => {
	describe('hex parsing', () => {
		it('round-trips a six-digit hex', () => {
			expect(rgbToHex(hexToRgb('#3f7ac2'))).toBe('#3f7ac2');
		});

		it('expands the three-digit form', () => {
			expect(hexToRgb('#0f0')).toEqual(hexToRgb('#00ff00'));
		});

		it('clamps out-of-range channels instead of wrapping', () => {
			expect(rgbToHex({ r: 2, g: -1, b: 0.5 })).toBe('#ff0080');
		});
	});

	describe('conversion', () => {
		// Reference values cross-checked against an independent implementation.
		it('places pure green very high on the lightness scale', () => {
			const { l, c, h } = hexToOklch('#00ff00');

			expect(l).toBeCloseTo(0.866, 2);
			expect(c).toBeCloseTo(0.295, 2);
			expect(h).toBeCloseTo(142.5, 0);
		});

		it('reports achromatic colours with no chroma', () => {
			expect(hexToOklch('#808080').c).toBeCloseTo(0, 3);
		});

		it('round-trips through oklch', () => {
			for (const hex of [
				'#00ff00',
				'#dc2626',
				'#1d4ed8',
				'#facc15',
				'#101010',
			]) {
				expect(rgbToHex(oklchToRgb(rgbToOklch(hexToRgb(hex))))).toBe(hex);
			}
		});
	});

	describe('gamut mapping', () => {
		it('leaves an in-gamut colour untouched', () => {
			const colour = { l: 0.5, c: 0.05, h: 200 };
			expect(clampChroma(colour).c).toBe(colour.c);
		});

		it('reduces chroma that sRGB cannot hold, keeping lightness and hue', () => {
			const requested = { l: 0.97, c: 0.3, h: 142.5 };
			const mapped = clampChroma(requested);

			expect(mapped.c).toBeLessThan(requested.c);
			expect(mapped.l).toBe(requested.l);
			expect(mapped.h).toBe(requested.h);
			expect(isInGamut(oklchToRgb(mapped))).toBe(true);
		});

		it('always produces a renderable colour', () => {
			for (let l = 0; l <= 1; l += 0.05) {
				for (let h = 0; h < 360; h += 30) {
					expect(isInGamut(hexToRgb(oklchToHex({ l, c: 0.4, h })))).toBe(true);
				}
			}
		});
	});

	describe('contrast ratio', () => {
		it('matches the WCAG extremes', () => {
			expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
			expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
		});

		it('is symmetric', () => {
			expect(contrastRatio('#123456', '#abcdef')).toBeCloseTo(
				contrastRatio('#abcdef', '#123456'),
				10,
			);
		});
	});
});
