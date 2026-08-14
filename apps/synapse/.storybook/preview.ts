import type { Decorator, Preview } from '@storybook/angular';
import {
	createPalette,
	paletteToCustomProperties,
	type ThemeTone,
} from '@synapse-copycat/ui';
import {
	mountThemePicker,
	readStoredSource,
	storeSource,
} from './theme-picker';

/**
 * Device colour, applied to every story.
 *
 * The palette is generated in TypeScript (`libs/ui/src/lib/theming`), because
 * the real source colour is only known once the Rust backend has enumerated the
 * devices. Wiring it into Storybook needs no Angular DI: `createPalette` is a
 * pure function and a decorator runs inside the preview iframe, so it can write
 * the `--syn-*` custom properties straight onto the document, overriding the
 * Sass defaults from `_roles.scss`.
 *
 * Two ways in, because the toolbar cannot host a free input (see theme-picker):
 *   - the toolbar list, for the presets worth revisiting
 *   - the picker in the bottom-right corner, for anything else
 *
 * The last two presets are the cases that broke the palette maths while it was
 * being written — keep them. Amber sits in the tone band where neither black
 * nor white text reaches AA, and white has no hue at all.
 */
const SOURCES = [
	{ value: '#00ff00', title: 'Razer green', left: '🟢' },
	{ value: '#ff2b2b', title: 'Red', left: '🔴' },
	{ value: '#1d4ed8', title: 'Blue', left: '🔵' },
	{ value: '#7c3aed', title: 'Purple', left: '🟣' },
	{ value: '#facc15', title: 'Amber (contrast edge case)', left: '🟡' },
	{ value: '#ffffff', title: 'White (achromatic edge case)', left: '⚪' },
];

/** Last toolbar value seen, so a toolbar change can override the picker. */
let lastPreset: string | undefined;
let source = readStoredSource() ?? SOURCES[0].value;
let tone: ThemeTone = 'dark';

function applyPalette(): void {
	const palette = createPalette(source, tone);
	const root = document.documentElement;

	for (const [property, value] of Object.entries(
		paletteToCustomProperties(palette),
	)) {
		root.style.setProperty(property, value);
	}

	// Paint the canvas with the generated surface, so the faint tint the source
	// carries into the neutrals is actually visible.
	document.body.style.backgroundColor = palette.surface;
	document.body.style.color = palette['on-surface'];
}

const withThemePalette: Decorator = (story, context) => {
	const preset = context.globals['themeSource'] as string;
	tone = context.globals['themeTone'] as ThemeTone;

	// A toolbar change wins over whatever the picker held; otherwise the picker
	// keeps its value across navigation.
	if (preset !== lastPreset) {
		lastPreset = preset;
		source = preset;
		storeSource(source);
	}

	applyPalette();
	mountThemePicker({
		value: source,
		onPick: (picked) => {
			source = picked;
			applyPalette();
		},
	});

	return story();
};

const preview: Preview = {
	globalTypes: {
		themeSource: {
			description: 'Colour reported by the connected device',
			toolbar: {
				title: 'Device colour',
				icon: 'paintbrush',
				items: SOURCES,
				dynamicTitle: true,
			},
		},
		themeTone: {
			description: 'Light or dark surfaces',
			toolbar: {
				title: 'Tone',
				icon: 'contrast',
				items: [
					{ value: 'dark', title: 'Dark' },
					{ value: 'light', title: 'Light' },
				],
				dynamicTitle: true,
			},
		},
	},

	initialGlobals: {
		themeSource: SOURCES[0].value,
		themeTone: 'dark',
	},

	parameters: {
		// Angular reflects a `model()` two-way binding as an implicit `xChange`
		// output, and Storybook's typings do not know it — `args: { valueChange:
		// fn() }` does not compile against the component. A regex is the only
		// way to reach those, and it is why the Actions panel logged nothing for
		// the slider, switch and checkbox.
		//
		// Outputs declared with `output()` still take an explicit `fn()`: the
		// spies this creates are not assertable inside a play function.
		actions: { argTypesRegex: '^(on[A-Z].*|.*Change)$' },
	},

	decorators: [withThemePalette],
};

export default preview;
