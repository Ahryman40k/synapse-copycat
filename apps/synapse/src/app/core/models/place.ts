/**
 * A fixed destination in the application bar.
 *
 * Fixed as opposed to a module, which is data: a module appears because
 * something reported it, and these are always there.
 *
 * They were three bespoke inputs and outputs on the bar — `homeRequested`,
 * `settingsRequested`, `settingsActive` — and every page added meant another
 * pair. One value says the same thing and adding a page is now a line in a
 * table.
 */
export type Place = 'home' | 'studio' | 'backgrounds' | 'settings';

/** What the bar shows, in the order it shows it. */
export const PLACES: readonly { place: Place; label: string; path: string }[] =
	[
		{ place: 'home', label: 'Synapse', path: '/dashboard' },
		{ place: 'studio', label: 'Effect studio', path: '/studio' },
		{ place: 'backgrounds', label: 'Background manager', path: '/backgrounds' },
	];

/**
 * ⚠️ The settings are **not** in `PLACES`. They sit outside the clipped region
 * of the bar, at the far end, so they are never what scrolls out of reach —
 * which means they are laid out separately even though they are a place like
 * the others.
 */
export const SETTINGS: { place: Place; label: string; path: string } = {
	place: 'settings',
	label: 'Settings',
	path: '/settings',
};

export const pathOf = (place: Place): string =>
	[...PLACES, SETTINGS].find((entry) => entry.place === place)?.path ?? '/';
