import { DOCUMENT } from '@angular/common';
import {
	computed,
	effect,
	inject,
	Injectable,
	signal,
	type Signal,
} from '@angular/core';
import { hexColor, length, parse, pipe, string } from 'valibot';
import {
	createPalette,
	type Palette,
	paletteToCustomProperties,
	type ThemeTone,
} from './palette';

/**
 * A device colour, `#rrggbb`.
 *
 * `hexColor()` alone also accepts `#rgb` and `#rrggbbaa`; the length check pins
 * it to the one form the palette maths expects. Exported so the application can
 * validate at the IPC boundary, where the colour actually arrives from Rust —
 * see root AGENTS.md §6.
 */
export const HexColor = pipe(
	string(),
	hexColor('Expected a hex colour'),
	length(7, 'Expected the #rrggbb form'),
);

/** Used until a device reports one, and on the browser/mock path. */
export const DEFAULT_SOURCE = '#00ff00';

/**
 * Publishes the palette as CSS custom properties on the document root.
 *
 * The palette cannot be computed by Sass: the source colour is only known once
 * the Rust backend has enumerated the devices. Sass declares the *roles* and
 * consumes them as `var(--syn-<role>)`; this service supplies the *values*.
 * Material 3 splits the work the same way.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
	readonly #document = inject(DOCUMENT);

	readonly #source = signal(DEFAULT_SOURCE);
	readonly #tone = signal<ThemeTone>('dark');

	/** The exact colour the hardware reports — what the device glow must use. */
	readonly source: Signal<string> = this.#source.asReadonly();
	readonly tone: Signal<ThemeTone> = this.#tone.asReadonly();

	readonly palette: Signal<Palette> = computed(() =>
		createPalette(this.#source(), this.#tone()),
	);

	constructor() {
		effect(() => this.#publish(this.palette()));
	}

	/**
	 * Adopt a device colour. Throws on anything that is not `#rrggbb` rather
	 * than silently falling back — a bad colour means the backend contract is
	 * wrong, and hiding it would leave the UI subtly miscoloured.
	 */
	setSource(source: string): void {
		this.#source.set(parse(HexColor, source).toLowerCase());
	}

	setTone(tone: ThemeTone): void {
		this.#tone.set(tone);
	}

	/** Escape hatch for Storybook and tests: render a palette into any element. */
	applyTo(element: HTMLElement, palette: Palette = this.palette()): void {
		for (const [property, value] of Object.entries(
			paletteToCustomProperties(palette),
		)) {
			element.style.setProperty(property, value);
		}
	}

	#publish(palette: Palette): void {
		const root = this.#document.documentElement;
		if (root) this.applyTo(root, palette);
	}
}
