import type {
	Ambience,
	BrightnessSource,
	ColourSource,
	MotionSource,
} from './ambience';

/**
 * An ambience, rendered to colours, here rather than on a device.
 *
 * ⚠️ **This is the Rust compositor written twice.** `razer::engine::ambience`
 * is the one that reaches hardware; this one draws the preview. Sending frames
 * across the IPC thirty times a second to fill a strip of coloured boxes would
 * be absurd, and a preview that needs a running daemon is no use to the
 * first-run wizard, which has to show an ambience before anything is set up.
 *
 * The duplication is kept honest by testing the same properties on both sides —
 * a still ambience is uniform, a wave wraps without a seam, circadian bottoms
 * at midnight, the three channels compose — rather than by hoping two readings
 * of the same description agree.
 *
 * Everything here is pure: time arrives as a parameter, so a test can ask for
 * any instant and a story can freeze one.
 */

/** Where in the day, as 0 at midnight and 0.5 at noon. */
export type Tick = { seconds: number; dayFraction: number };

/** Noon, so a preview is not dimmed by circadian unless asked. */
export const at = (seconds: number): Tick => ({ seconds, dayFraction: 0.5 });

type Rgb = { r: number; g: number; b: number };

const clampUnit = (value: number) => Math.min(1, Math.max(0, value));

const toHex = ({ r, g, b }: Rgb): string =>
	`#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;

const fromHex = (hex: string): Rgb => ({
	r: Number.parseInt(hex.slice(1, 3), 16),
	g: Number.parseInt(hex.slice(3, 5), 16),
	b: Number.parseInt(hex.slice(5, 7), 16),
});

const scaled = ({ r, g, b }: Rgb, factor: number): Rgb => {
	const by = clampUnit(factor);
	return {
		r: Math.round(r * by),
		g: Math.round(g * by),
		b: Math.round(b * by),
	};
};

/**
 * A hue on the wheel, fully saturated. `turn` is 0..1.
 *
 * Not the OKLCH machinery `libs/ui` uses for the interface: that exists to keep
 * text readable against a background, which is not a problem LEDs have.
 */
function hueToRgb(turn: number): Rgb {
	const sector = (((turn % 1) + 1) % 1) * 6;
	const rising = Math.floor((sector % 1) * 255);
	const falling = 255 - rising;

	switch (Math.floor(sector) % 6) {
		case 0:
			return { r: 255, g: rising, b: 0 };
		case 1:
			return { r: falling, g: 255, b: 0 };
		case 2:
			return { r: 0, g: 255, b: rising };
		case 3:
			return { r: 0, g: falling, b: 255 };
		case 4:
			return { r: rising, g: 0, b: 255 };
		default:
			return { r: 255, g: 0, b: falling };
	}
}

function colourAt(
	source: ColourSource,
	column: number,
	columns: number,
	tick: Tick,
): Rgb {
	if (source.type === 'fixed') return fromHex(source.rgb);

	if (source.type === 'palette') {
		return paletteAt(
			source.colours,
			source.turnsPerSecond,
			column,
			columns,
			tick,
		);
	}

	const across = columns > 1 ? column / (columns - 1) : 0;
	return hueToRgb(
		tick.seconds * source.turnsPerSecond + across * source.spread,
	);
}

/**
 * Where a column lands in a palette that wraps.
 *
 * Divided by the column count and not by one less — the same reason the wave
 * is. Positions then sit at 0, 1/n … (n-1)/n, so the step from the last column
 * back to the first is like every other and the blend does not hesitate once a
 * lap.
 *
 * ⚠️ The blend is linear in sRGB, like the Rust one. Between two nearby hues —
 * which is what an image gives — that is indistinguishable from anything
 * better; between two opposite ones it passes through grey.
 */
function paletteAt(
	colours: string[],
	turnsPerSecond: number,
	column: number,
	columns: number,
	tick: Tick,
): Rgb {
	if (colours.length === 0) return { r: 0, g: 0, b: 0 };
	if (colours.length === 1) return fromHex(colours[0]);

	const across = column / Math.max(1, columns);
	const drift = tick.seconds * turnsPerSecond;
	const position = ((((across + drift) % 1) + 1) % 1) * colours.length;

	const first = Math.floor(position) % colours.length;
	const second = (first + 1) % colours.length;
	return blend(
		fromHex(colours[first]),
		fromHex(colours[second]),
		position - Math.floor(position),
	);
}

/** Straight-line mix of two colours, `amount` from the first to the second. */
function blend(from: Rgb, to: Rgb, amount: number): Rgb {
	const by = clampUnit(amount);
	const mix = (a: number, b: number) => Math.round(a + (b - a) * by);
	return { r: mix(from.r, to.r), g: mix(from.g, to.g), b: mix(from.b, to.b) };
}

function motionAt(
	source: MotionSource,
	column: number,
	columns: number,
	tick: Tick,
): number {
	switch (source.type) {
		case 'none':
			return 1;

		case 'wave': {
			// Divided by the column count, not `columns - 1`: positions then sit
			// at 0, 1/n … (n-1)/n and the step from the last back to the first is
			// 1/n like every other, so the wave does not hesitate once a lap.
			const position = column / Math.max(1, columns);
			const head = (((tick.seconds * source.lapsPerSecond) % 1) + 1) % 1;
			const raw = Math.abs(position - head);
			// The short way round, so the band does not tear as it wraps.
			const distance = Math.min(raw, 1 - raw);
			return clampUnit(1 - distance / Math.max(source.width, Number.EPSILON));
		}

		case 'pulse': {
			const period = Math.max(source.period, 1) / 1000;
			// Cosine rather than a triangle: a breath has no corners.
			return (1 - Math.cos((tick.seconds / period) * Math.PI * 2)) / 2;
		}
	}
}

function brightnessAt(source: BrightnessSource, tick: Tick): number {
	if (source.type === 'fixed') return clampUnit(source.level);

	// Peaks at noon, bottoms at midnight.
	const noon = (1 - Math.cos(tick.dayFraction * Math.PI * 2)) / 2;
	return clampUnit(source.night + (source.day - source.night) * noon);
}

/**
 * One row of the ambience, as `#rrggbb` per column.
 *
 * A row rather than a matrix: every source varies along the columns and not
 * across them, so a strip shows everything a grid would and reads better at
 * preview size.
 */
export function composeStrip(
	ambience: Ambience,
	columns: number,
	tick: Tick,
): string[] {
	const level = brightnessAt(ambience.brightness, tick);

	return Array.from({ length: columns }, (_, column) => {
		const hue = colourAt(ambience.colour, column, columns, tick);
		const intensity = motionAt(ambience.motion, column, columns, tick);
		return toHex(scaled(hue, intensity * level));
	});
}
