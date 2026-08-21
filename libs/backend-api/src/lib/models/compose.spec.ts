import { still } from './ambience';
import type { Ambience } from './ambience';
import { at, composeStrip } from './compose';

/**
 * The same properties the Rust compositor is tested on.
 *
 * That is what keeps two copies of one calculation honest: not a shared
 * description that each side reads its own way, but the same assertions made
 * twice. `razer::engine::ambience` has these under the same names.
 */

const RED = '#ff0000';
const BLACK = '#000000';

/** One crossing a second, a band covering a fifth of whatever it is on. */
const CROSSING = { type: 'wave', lapsPerSecond: 1, width: 0.2 } as const;

describe('composeStrip', () => {
	it('paints one colour everywhere when nothing moves', () => {
		const strip = composeStrip(still(RED), 14, at(0));

		expect(strip).toHaveLength(14);
		expect(new Set(strip)).toEqual(new Set([RED]));
	});

	it('does not move when nothing moves', () => {
		// A still ambience costs nothing to hold, on a device or here.
		expect(composeStrip(still(RED), 14, at(0))).toEqual(
			composeStrip(still(RED), 14, at(9.5)),
		);
	});

	it('dims without touching the hue', () => {
		const dim: Ambience = {
			...still(RED),
			brightness: { type: 'fixed', level: 0.5 },
		};

		expect(composeStrip(dim, 1, at(0))[0]).toBe('#800000');
	});

	it('is lowest at midnight and highest at noon', () => {
		const ambience: Ambience = {
			...still('#646464'),
			brightness: { type: 'circadian', day: 1, night: 0.2 },
		};
		const level = (dayFraction: number) =>
			Number.parseInt(
				composeStrip(ambience, 1, { seconds: 0, dayFraction })[0].slice(1, 3),
				16,
			);

		expect(level(0)).toBe(20);
		expect(level(0.5)).toBe(100);
		// And no step between them: dusk sits in the middle, not on one side.
		expect(level(0.75)).toBeGreaterThan(20);
		expect(level(0.75)).toBeLessThan(100);
	});

	it('lights one place and leaves the rest dark', () => {
		const strip = composeStrip({ ...still(RED), motion: CROSSING }, 14, at(0));

		expect(strip[0]).toBe(RED);
		expect(strip[7]).toBe(BLACK);
	});

	it('travels', () => {
		// Half a lap: the head is at the middle and the edge it left is dark.
		const strip = composeStrip(
			{ ...still(RED), motion: CROSSING },
			14,
			at(0.5),
		);

		expect(strip[7]).toBe(RED);
		expect(strip[0]).toBe(BLACK);
	});

	it('wraps without tearing', () => {
		// Just short of a lap: the first column is the head's neighbour going the
		// short way round. Measuring the long way leaves a dark seam once a lap.
		const strip = composeStrip(
			{ ...still(RED), motion: CROSSING },
			14,
			at(0.95),
		);

		expect(strip[0]).not.toBe(BLACK);
	});

	it('breathes between dark and full', () => {
		const ambience: Ambience = {
			...still(RED),
			motion: { type: 'pulse', period: 2000 },
		};
		const red = (seconds: number) =>
			Number.parseInt(
				composeStrip(ambience, 1, at(seconds))[0].slice(1, 3),
				16,
			);

		expect(red(0)).toBe(0);
		expect(red(1)).toBe(255);
		expect(red(2)).toBe(0);
	});

	it('spreads a rainbow across the strip', () => {
		const ambience: Ambience = {
			...still(RED),
			colour: { type: 'rainbow', turnsPerSecond: 0, spread: 1 },
		};
		const strip = composeStrip(ambience, 14, at(0));

		expect(strip[0]).not.toBe(strip[7]);
	});

	it('composes the three channels rather than letting one win', () => {
		const ambience: Ambience = {
			colour: { type: 'rainbow', turnsPerSecond: 0.2, spread: 1 },
			motion: { type: 'wave', lapsPerSecond: 4, width: 0.15 },
			brightness: { type: 'fixed', level: 0.5 },
		};

		const lit = composeStrip(ambience, 22, at(1)).filter(
			(colour) => colour !== BLACK,
		);

		expect(lit.length).toBeGreaterThan(0);
		expect(lit.length).toBeLessThan(22);
		// Halved by brightness, so nothing reaches full even at the head.
		for (const colour of lit) {
			const channels = [1, 3, 5].map((at) =>
				Number.parseInt(colour.slice(at, at + 2), 16),
			);
			expect(Math.max(...channels)).toBeLessThanOrEqual(128);
		}
	});

	it('still gives a single cell a colour', () => {
		// A Goliathus is one LED. A rainbow has nowhere to spread, and dividing
		// by `columns - 1` must not blow up.
		const ambience: Ambience = {
			...still(RED),
			colour: { type: 'rainbow', turnsPerSecond: 1, spread: 1 },
		};

		expect(composeStrip(ambience, 1, at(0.25))[0]).not.toBe(BLACK);
	});
});
