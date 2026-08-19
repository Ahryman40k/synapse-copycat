import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import type { Device, Module } from '@synapse-copycat/backend-api';
import { filter, map } from 'rxjs';

/** Where the application is, read back from the address. */
export type AppLocation =
	| { on: 'home' }
	| { on: 'settings' }
	| { on: 'device'; id: string }
	| { on: 'module'; kind: string };

/**
 * `/device/mouse/5426-0136` -> a device, `/module/twinkly` -> a module,
 * `/settings` -> the settings, anything else -> home.
 *
 * Exported so it can be tested for what it is — string handling — with no
 * router, no injector and no component.
 */
export function locationOf(url: string): AppLocation {
	const [first, second, third] = url.split('?')[0].split('/').filter(Boolean);

	if (first === 'settings') return { on: 'settings' };
	if (first === 'device' && third) return { on: 'device', id: third };
	if (first === 'module' && second) return { on: 'module', kind: second };

	return { on: 'home' };
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

	/** The key the application bar marks as current; undefined means Home. */
	readonly activeId = computed(() => {
		const location = this.location();

		if (location.on === 'device') return location.id;
		if (location.on === 'module') return location.kind;
		return undefined;
	});

	/**
	 * Said separately because `activeId` only names devices and modules —
	 * without it, Home would light up over the settings page.
	 */
	readonly onSettings = computed(() => this.location().on === 'settings');

	/** `kind` picks the page component, `id` picks the device. */
	open(device: Device): void {
		this.#go(['device', device.kind, device.id], device.kind);
	}

	openModule(module: Module): void {
		this.#go(['module', module.kind], module.kind);
	}

	settings(): void {
		this.#go(['settings'], 'settings');
	}

	home(): void {
		void this.#router.navigateByUrl('/');
	}

	/**
	 * Navigate, and say so when there is nowhere to go.
	 *
	 * Several kinds have no route: `module/**` has none at all, and the
	 * keyboard, accessory and streaming device routes are commented out in
	 * app.routes.ts. `Router.navigate` resolves to `false` in that case rather
	 * than throwing, so the click looked like it simply did nothing — the URL
	 * never changed, so neither did the current entry in the bar.
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
