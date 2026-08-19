import type { SelectOption } from '@synapse-copycat/ui';

/**
 * ⚠️ One entry. Nothing is translated yet — there are no message files and no
 * `@angular/localize` in the build — so this records a preference rather than
 * acting on one. It is here because the shape is what a second language will
 * need, and because a settings page with nothing in it says less than a
 * settings page that admits where it stands.
 */
export type Language = 'en';

export const LANGUAGE_DEFAULT: Language = 'en';

export const LANGUAGES: readonly SelectOption[] = [
	{ value: 'en', label: 'English' },
];
