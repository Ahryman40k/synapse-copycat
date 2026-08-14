import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createPalette, type ThemeRole } from '../../lib/theming/palette';
import { DEFAULT_SOURCE } from '../../lib/theming/theme';

/**
 * `_roles.scss` carries a hardcoded copy of the default palette, because Sass
 * cannot run the TypeScript generator at build time. That copy is what the UI
 * renders before `ThemeService` publishes anything — first paint, Storybook,
 * and the browser/mock path.
 *
 * A hardcoded copy drifts. This test is what stops it: if the ladder, the
 * gamut mapping or a tone is changed in TypeScript, the Sass defaults become
 * stale and this fails with the values to paste back.
 */

const SCSS = readFileSync(join(__dirname, '_roles.scss'), 'utf8');

function parseDefaultPalette(source: string): Record<string, string> {
	const block = source.match(/\$default-dark:\s*\(([\s\S]*?)\);/);
	if (!block) throw new Error('$default-dark map not found in _roles.scss');

	return Object.fromEntries(
		[...block[1].matchAll(/'([\w-]+)':\s*(#[0-9a-fA-F]{6})\s*,/g)].map(
			([, role, value]) => [role, value.toLowerCase()],
		),
	);
}

describe('_roles.scss defaults', () => {
	const declared = parseDefaultPalette(SCSS);
	const expected = createPalette(DEFAULT_SOURCE, 'dark');

	it('declares exactly the roles the generator produces', () => {
		expect(Object.keys(declared).sort()).toEqual(
			Object.keys(expected).sort() as ThemeRole[],
		);
	});

	it('matches createPalette(DEFAULT_SOURCE) role for role', () => {
		// If this fails, regenerate the map rather than editing it by hand.
		expect(declared).toEqual(expected);
	});
});
