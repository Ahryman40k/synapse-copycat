import {
	ChangeDetectionStrategy,
	Component,
	computed,
	signal,
} from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { contrastRatio } from './oklch';
import { createPalette, type ThemeRole, type ThemeTone } from './palette';

/** Roles that carry text, with the surface they sit on. */
const PAIRS: ReadonlyArray<[ThemeRole, ThemeRole]> = [
	['on-surface', 'surface'],
	['on-surface-variant', 'surface'],
	['on-surface', 'surface-container'],
	['on-primary', 'primary'],
	['on-primary-container', 'primary-container'],
	['on-error', 'error'],
	['on-warning', 'warning'],
	['on-success', 'success'],
];

const SWATCHES: ReadonlyArray<ThemeRole> = [
	'primary-source',
	'primary',
	'primary-hover',
	'primary-active',
	'primary-container',
	'surface',
	'surface-container',
	'surface-variant',
	'outline',
	'error',
	'warning',
	'success',
];

@Component({
	selector: 'syn-palette-story-host',
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="wrap" [style.background]="palette()['surface']" [style.color]="palette()['on-surface']">
			<header>
				<label>
					Device colour
					<input type="color" [value]="source()" (input)="pick($event)" />
				</label>
				<code>{{ source() }}</code>
				<button type="button" (click)="toggleTone()">tone: {{ tone() }}</button>
			</header>

			<p class="note">
				The chosen colour only contributes hue and chroma. Lightness always
				comes from the tone ladder — which is why the text below stays
				readable whatever you pick.
			</p>

			<section class="swatches">
				@for (role of swatches; track role) {
					<figure>
						<div class="chip" [style.background]="palette()[role]"></div>
						<figcaption>{{ role }}<br /><code>{{ palette()[role] }}</code></figcaption>
					</figure>
				}
			</section>

			<h4>Contrast — WCAG AA needs 4.5:1</h4>
			<section class="pairs">
				@for (pair of contrasts(); track pair.label) {
					<div class="pair" [style.background]="pair.background" [style.color]="pair.foreground">
						<span>{{ pair.label }}</span>
						<strong>{{ pair.ratio }}:1 {{ pair.pass ? '✓' : '✗' }}</strong>
					</div>
				}
			</section>
		</div>
	`,
	styles: `
		.wrap { padding: 1.5rem; border-radius: 0.5rem; font: 13px/1.5 system-ui, sans-serif; }
		header { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem; }
		.note { margin: 0 0 1.5rem; opacity: 0.7; max-width: 60ch; }
		.swatches { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 2rem; }
		figure { margin: 0; width: 8.5rem; }
		.chip { height: 3rem; border-radius: 0.375rem; border: 1px solid rgb(128 128 128 / 0.3); }
		figcaption { margin-top: 0.35rem; font-size: 11px; opacity: 0.85; }
		h4 { margin: 0 0 0.5rem; }
		.pairs { display: flex; flex-direction: column; gap: 0.25rem; }
		.pair { display: flex; justify-content: space-between; padding: 0.5rem 0.75rem; border-radius: 0.25rem; }
	`,
})
export class PaletteStoryHost {
	protected readonly swatches = SWATCHES;

	protected readonly source = signal('#00ff00');
	protected readonly tone = signal<ThemeTone>('dark');

	protected readonly palette = computed(() =>
		createPalette(this.source(), this.tone()),
	);

	protected readonly contrasts = computed(() => {
		const palette = this.palette();
		return PAIRS.map(([foreground, background]) => {
			const ratio = contrastRatio(palette[foreground], palette[background]);
			return {
				label: `${foreground} on ${background}`,
				foreground: palette[foreground],
				background: palette[background],
				ratio: ratio.toFixed(2),
				pass: ratio >= 4.5,
			};
		});
	});

	protected pick(event: Event): void {
		const target = event.target;
		if (target instanceof HTMLInputElement) this.source.set(target.value);
	}

	protected toggleTone(): void {
		this.tone.update((tone) => (tone === 'dark' ? 'light' : 'dark'));
	}
}

const meta: Meta<PaletteStoryHost> = {
	title: 'UI library / Theming',
	decorators: [moduleMetadata({ imports: [PaletteStoryHost] })],
};

export default meta;

/**
 * Pick any colour and watch the whole set follow. Every contrast row must stay
 * green — that property is asserted for nine hostile sources in palette.spec.ts.
 */
export const PaletteExplorer: StoryObj<PaletteStoryHost> = {
	render: () => ({ template: '<syn-palette-story-host />' }),
};
