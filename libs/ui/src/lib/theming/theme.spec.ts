import { TestBed } from '@angular/core/testing';
import { safeParse } from 'valibot';
import { createPalette } from './palette';
import { DEFAULT_SOURCE, HexColor, ThemeService } from './theme';

const service = () => TestBed.inject(ThemeService);
const root = () => document.documentElement;

describe('HexColor', () => {
	it.each(['#00ff00', '#FFFFFF', '#0b0b0b'])('accepts %s', (value) => {
		expect(safeParse(HexColor, value).success).toBe(true);
	});

	it.each([
		['#0f0', 'the shorthand form the palette maths does not expect'],
		['#00ff00ff', 'an alpha channel'],
		['00ff00', 'a missing hash'],
		['#GGGGGG', 'non-hex digits'],
		['red', 'a colour keyword'],
		['', 'an empty string'],
	])('rejects %s (%s)', (value) => {
		expect(safeParse(HexColor, value).success).toBe(false);
	});
});

describe('ThemeService', () => {
	beforeEach(() => {
		TestBed.configureTestingModule({});
		root().removeAttribute('style');
	});

	it('starts from the default source', () => {
		expect(service().source()).toBe(DEFAULT_SOURCE);
	});

	it('publishes every role as a custom property on the document root', () => {
		const palette = service().palette();
		TestBed.tick(); // the publishing effect runs on the next turn

		for (const [role, value] of Object.entries(palette)) {
			expect(root().style.getPropertyValue(`--syn-${role}`)).toBe(value);
		}
	});

	it('republishes when the source changes', () => {
		service();
		TestBed.tick();
		const before = root().style.getPropertyValue('--syn-primary');

		service().setSource('#1d4ed8');
		TestBed.tick();

		expect(root().style.getPropertyValue('--syn-primary')).not.toBe(before);
		expect(root().style.getPropertyValue('--syn-primary')).toBe(
			createPalette('#1d4ed8').primary,
		);
	});

	it('keeps the raw colour available for the device glow', () => {
		service().setSource('#dc2626');
		TestBed.tick();

		expect(service().source()).toBe('#dc2626');
		expect(root().style.getPropertyValue('--syn-primary-source')).toBe(
			'#dc2626',
		);
	});

	it('republishes when the tone changes', () => {
		service();
		TestBed.tick();
		const dark = root().style.getPropertyValue('--syn-surface');

		service().setTone('light');
		TestBed.tick();

		expect(root().style.getPropertyValue('--syn-surface')).not.toBe(dark);
	});

	it('rejects an invalid colour instead of falling back silently', () => {
		expect(() => service().setSource('not-a-colour')).toThrow();
		expect(service().source()).toBe(DEFAULT_SOURCE);
	});

	it('normalises case so the same colour is one value', () => {
		service().setSource('#00FF00');
		expect(service().source()).toBe('#00ff00');
	});

	it('can target an element other than the document root', () => {
		const element = document.createElement('div');

		service().applyTo(element, createPalette('#facc15'));

		expect(element.style.getPropertyValue('--syn-primary-source')).toBe(
			'#facc15',
		);
	});
});
