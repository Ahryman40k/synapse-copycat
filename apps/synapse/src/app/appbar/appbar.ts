import {
	booleanAttribute,
	ChangeDetectionStrategy,
	Component,
	input,
	output,
} from '@angular/core';
import { RazerLogo } from '../core/components/razer-logo/razer-logo';
import { type Place, PLACES, SETTINGS } from '../core/models/place';

/**
 * The application-level navigation bar.
 *
 * It stays dumb: it emits which place was asked for and the layout, which
 * already owns the Router, does the navigating. `place` comes back the same
 * way, so the bar can mark the current entry without ever importing the router.
 *
 * **Devices are not in here.** They were, one entry per kind, and it was the
 * wrong shape twice over: the bar competed with the dashboard for the same job,
 * and the entries said `mouse (1)` / `mouse (2)` because real device names do
 * not fit a bar someone can make narrow — a label nobody can match to the thing
 * on their desk. A device is now opened from its own tile, which carries its
 * picture and its name.
 *
 * ⚠️ **Modules are not in here either, and used to be.** They were the only
 * entries this bar rendered from data, and the only ones that could overflow —
 * so removing them took the `⋯` menu and its IntersectionObserver with them.
 * That machinery is worth knowing about rather than rediscovering: it kept
 * clipped buttons in the layout with `visibility: hidden` to stop the classic
 * oscillation where hiding an item frees the room that makes it fit again, and
 * it observed the entries region rather than the host because an
 * `overflow: hidden` ancestor also clips absolutely positioned descendants. Git
 * history has it, and the day a data-driven entry comes back it should be
 * lifted rather than rewritten.
 *
 * The fixed places never overflowed: they carried no observed ref, so the bar
 * has lost no behaviour anyone could reach.
 */
@Component({
	selector: 'syn-bar, nav[synapse-bar]',
	templateUrl: './appbar.html',
	styleUrl: './appbar.scss',
	imports: [RazerLogo],
	host: {
		role: 'navigation',
		'[attr.aria-label]': 'ariaLabel()',
	},
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppBar {
	protected readonly places = PLACES;
	protected readonly settings = SETTINGS;

	/**
	 * The fixed place currently shown.
	 *
	 * One value in place of the three flags this had — an id for modules, a
	 * `settingsActive` boolean, and Home inferred from both being empty. Home is
	 * a place like the others now, so nothing has to be inferred.
	 */
	readonly place = input<Place | undefined>('home');

	readonly ariaLabel = input('Places');

	readonly placeRequested = output<Place>();

	/**
	 * Marks the gear as the current page.
	 *
	 * ⚠️ Redundant with `place() === 'settings'` and kept because it is a
	 * declared input others may set; the template reads `place`, which is the
	 * one that cannot disagree with the address.
	 */
	readonly settingsActive = input(false, { transform: booleanAttribute });
}
