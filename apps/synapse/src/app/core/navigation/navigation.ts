import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import type { Module } from '@synapse-copycat/backend-api';
import { type Place, PLACES, SETTINGS, pathOf } from '../models/place';
import { filter, map } from 'rxjs';

/** Where the application is, read back from the address. */
export type AppLocation = { on: Place } | { on: 'module'; kind: string };

/**
 * `/module/twinkly` -> a module, and every fixed place by its own path.
 * Anything else is home, which is the fallback rather than a case of its own.
 *
 * ⚠️ There is no device address any more. A device is not a place you navigate
 * to: it is inspected in a dialog over the dashboard, which is where it sits.
 *
 * Exported so it can be tested for what it is — string handling — with no
 * router, no injector and no component.
 */
export function locationOf(url: string): AppLocation {
	const [first, second] = url.split('?')[0].split('/').filter(Boolean);

	if (first === 'module' && second) return { on: 'module', kind: second };

	// Matched against the table rather than a chain of comparisons, so a page
	// added there is recognised here without anyone remembering to come back.
	const place = [...PLACES, SETTINGS].find(
		(entry) => entry.path === `/${first}`,
	);

	return place ? { on: place.place } : { on: 'home' };
}

/**
 * The one place that knows how anything the bar shows turns into a URL, and
 * how a URL turns back.
 *
 * Both the application bar and the dashboard open a device, and both used to
 * build the route themselves — two copies of the same shape, drifting the
 * moment the routes change. Reading the address back had drifted the same way:
 * it lived in `default-layout`, which is responsible for where things sit on
 * the screen, not for what an address means. Same knowledge, so same place.
 */
@Injectable({ providedIn: 'root' })
export class Navigation {
	readonly #router = inject(Router);

	/**
	 * Read from the URL rather than remembered on activation, so it stays right
	 * after a back/forward, or on an address opened directly.
	 */
	readonly #url = toSignal(
		this.#router.events.pipe(
			filter((event) => event instanceof NavigationEnd),
			map(() => this.#router.url),
		),
		{ initialValue: this.#router.url },
	);

	readonly location = computed(() => locationOf(this.#url()));

	/** The module the bar marks as current, if a module is what is open. */
	readonly activeId = computed(() => {
		const location = this.location();
		return location.on === 'module' ? location.kind : undefined;
	});

	/**
	 * The fixed place the bar marks as current.
	 *
	 * `undefined` while a module is open — nothing fixed is current then, and
	 * saying "home" would light the wrong entry.
	 */
	readonly place = computed(() => {
		const location = this.location();
		return location.on === 'module' ? undefined : location.on;
	});

	openModule(module: Module): void {
		this.#go(['module', module.kind], module.kind);
	}

	go(place: Place): void {
		void this.#router.navigateByUrl(pathOf(place));
	}

	/**
	 * Navigate, and say so when there is nowhere to go.
	 *
	 * `module/**` has no route at all. `Router.navigate` resolves to `false` in
	 * that case rather than throwing, so the click looked like it simply did
	 * nothing — the URL never changed, so neither did the current entry in the
	 * bar.
	 */
	#go(commands: unknown[], kind: string): void {
		void this.#router.navigate(commands).then((navigated) => {
			if (!navigated) {
				console.warn(
					`[synapse] no route for "${kind}" — see app.routes.ts. Nothing will open.`,
				);
			}
		});
	}
}
