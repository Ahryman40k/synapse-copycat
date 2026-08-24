import type { Mock } from './mock';

/**
 * A folder of wallpapers, in the browser.
 *
 * There is no filesystem here and no native picker, so the folder is invented
 * and the images with it. What matters is that the *shape* is the one the
 * backend sends: a thumbnail as a `data:` URI and a palette of `#rrggbb`
 * ordered by hue.
 *
 * ⚠️ The thumbnails are generated **from the palettes**, not the other way
 * round — the real extractor reads a photograph and this cannot. That makes
 * them honest about what they are: a picture of the colours, not a picture the
 * colours came from. A page built against them looks right and proves nothing
 * about the cut, which `libs/palette` tests on its own.
 */

/** Where the browser pretends the images are. */
const FOLDER = '/home/you/Pictures/Wallpapers';

type Sample = { name: string; palette: string[] };

const SAMPLES: Sample[] = [
	{
		name: 'Harbour at dusk',
		palette: ['#1b3a5c', '#3d6b8e', '#c86a3d', '#f2c14e', '#8a4b2a'],
	},
	{
		name: 'Pine slope',
		palette: ['#16351f', '#2f5d3a', '#7a9b5c', '#c9d6a3', '#4a3b28'],
	},
	{
		name: 'Salt flat',
		palette: ['#2a2f45', '#6b7594', '#b9bed0', '#e8e4d9', '#d7a86e'],
	},
	{
		name: 'Neon alley',
		palette: ['#12111c', '#4b1f5e', '#a02b7a', '#e0457b', '#f5a25d'],
	},
];

/**
 * A gradient of the palette, as an SVG `data:` URI.
 *
 * Inline SVG rather than a base64 PNG: it is readable in the source, weighs a
 * couple of hundred bytes, and needs nothing to encode it.
 */
function thumbnail(palette: string[]): string {
	const stops = palette
		.map((colour, index) => {
			const offset = (index / Math.max(1, palette.length - 1)) * 100;
			return `<stop offset="${offset}%" stop-color="${colour}"/>`;
		})
		.join('');

	const svg =
		`<svg xmlns="http://www.w3.org/2000/svg" width="192" height="108">` +
		`<defs><linearGradient id="g" x1="0" x2="1">${stops}</linearGradient></defs>` +
		`<rect width="192" height="108" fill="url(#g)"/>` +
		`</svg>`;

	// `encodeURIComponent` rather than base64: an SVG data URI takes the source
	// as it is, and staying readable is worth the handful of extra bytes.
	return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function mockWallpapers(): Pick<
	Mock,
	'choose_wallpaper_folder' | 'wallpapers'
> {
	return {
		choose_wallpaper_folder: () => FOLDER,

		wallpapers: ({ folder }) =>
			// Answers for the invented folder and nothing else, so a page that
			// asks about somewhere it was never given gets an empty answer
			// rather than the same four pictures.
			folder === FOLDER
				? SAMPLES.map((sample) => ({
						path: `${FOLDER}/${sample.name.toLowerCase().replaceAll(' ', '-')}.jpg`,
						name: sample.name,
						thumbnail: thumbnail(sample.palette),
						palette: sample.palette,
					}))
				: [],
	};
}
