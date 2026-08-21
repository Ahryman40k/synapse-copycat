import { TestBed } from '@angular/core/testing';
import type { Ambience } from '@synapse-copycat/backend-api';
import {
	mockGroups,
	provideBackendApi,
	still,
	unusedCommands,
	withMock,
} from '@synapse-copycat/backend-api';
import { DEFAULT_SOURCE, ThemeService } from '@synapse-copycat/ui';
import { ApplicationStore } from '../stores/application-store';
import { AmbienceTheme, themeSourceOf } from './ambience-theme';

/**
 * The rule this has to hold is the one from AGENTS.md §8: the chosen colour
 * contributes **hue and chroma only, never lightness**. Everything an ambience
 * does to brightness is therefore invisible here, and that is what these
 * assert — not that the numbers are pretty, but that dimming and moving change
 * nothing about the interface's colour.
 */
describe('themeSourceOf', () => {
	it('takes a fixed colour as it is', () => {
		expect(themeSourceOf(still('#3355ff'))).toBe('#3355ff');
	});

	it('falls back to the default when there is no ambience', () => {
		// First paint, and the browser path before anything is enumerated.
		expect(themeSourceOf(undefined)).toBe(DEFAULT_SOURCE);
	});

	it('ignores the brightness, whatever it is doing', () => {
		// Lightness comes from the tone ladder. A dim ambience must not wash the
		// interface out, and a circadian one must not make it drift all day.
		const dim: Ambience = {
			...still('#3355ff'),
			brightness: { type: 'fixed', level: 0.1 },
		};
		const circadian: Ambience = {
			...still('#3355ff'),
			brightness: { type: 'circadian', day: 1, night: 0.05 },
		};

		expect(themeSourceOf(dim)).toBe('#3355ff');
		expect(themeSourceOf(circadian)).toBe('#3355ff');
	});

	it('ignores the motion, whatever it is doing', () => {
		// A wave of green is still green, and a pulse must not make the
		// interface breathe.
		const wave: Ambience = {
			...still('#3355ff'),
			motion: { type: 'wave', lapsPerSecond: 2, width: 0.1 },
		};
		const pulse: Ambience = {
			...still('#3355ff'),
			motion: { type: 'pulse', period: 800 },
		};

		expect(themeSourceOf(wave)).toBe('#3355ff');
		// A pulse is at its darkest at t=0 — reading the composed frame rather
		// than the colour channel would hand the palette black.
		expect(themeSourceOf(pulse)).toBe('#3355ff');
	});

	it('gives a rainbow one hue and holds it', () => {
		// ⚠️ A rainbow has no single colour. This is the hue its wheel starts
		// at, chosen so the palette is stable: sampling it live would rewrite
		// every custom property each frame and set the whole interface crawling
		// through the spectrum.
		const rainbow: Ambience = {
			...still('#000000'),
			colour: { type: 'rainbow', turnsPerSecond: 4, spread: 1 },
		};

		expect(themeSourceOf(rainbow)).toBe('#ff0000');
	});

	it('is fully saturated for a rainbow, whatever else is set', () => {
		const dimRainbow: Ambience = {
			colour: { type: 'rainbow', turnsPerSecond: 1, spread: 1 },
			motion: { type: 'pulse', period: 1000 },
			brightness: { type: 'fixed', level: 0.2 },
		};

		expect(themeSourceOf(dimRainbow)).toBe('#ff0000');
	});
});

describe('AmbienceTheme', () => {
	const setup = (participants: string[], colour = '#3355ff') => {
		TestBed.configureTestingModule({
			providers: [
				provideBackendApi(
					withMock({
						...unusedCommands(),
						...mockGroups(participants, colour),
					}),
				),
			],
		});

		return {
			store: TestBed.inject(ApplicationStore),
			theme: TestBed.inject(ThemeService),
		};
	};

	it('adopts the first group’s colour', async () => {
		const { store, theme } = setup(['aaa']);
		TestBed.inject(AmbienceTheme);

		await store.getGroups();
		TestBed.tick();

		expect(theme.source()).toBe('#3355ff');
	});

	it('follows the group when its ambience changes', async () => {
		const { store, theme } = setup(['aaa']);
		TestBed.inject(AmbienceTheme);
		await store.getGroups();
		TestBed.tick();

		await store.setGroupAmbience(store.groups()[0].group.id, still('#ff2200'));
		TestBed.tick();

		expect(theme.source()).toBe('#ff2200');
	});

	it('keeps the default while there is no group', () => {
		const { theme } = setup([]);
		TestBed.inject(AmbienceTheme);
		TestBed.tick();

		expect(theme.source()).toBe(DEFAULT_SOURCE);
	});
});
