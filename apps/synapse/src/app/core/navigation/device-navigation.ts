import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import type { Device, Module } from '@synapse-copycat/backend-api';

/**
 * The one place that knows how a device or module turns into a URL.
 *
 * Both the application bar and the dashboard open a device, and both used to
 * build the route themselves — two copies of the same shape, drifting the
 * moment the routes change.
 */
@Injectable({ providedIn: 'root' })
export class DeviceNavigation {
	readonly #router = inject(Router);

	/** `kind` picks the page component, `id` picks the device. */
	open(device: Device): void {
		this.#go(['device', device.kind, device.id], device.kind);
	}

	openModule(module: Module): void {
		this.#go(['module', module.kind], module.kind);
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
