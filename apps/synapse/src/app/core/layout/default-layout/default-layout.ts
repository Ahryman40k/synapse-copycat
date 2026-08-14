import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import type { Device, Module } from '@synapse-copycat/backend-api';
import { filter, map } from 'rxjs';
import { AppBar } from '../../../appbar/appbar';
import { DeviceNavigation } from '../../navigation/device-navigation';
import { ApplicationStore } from '../../stores/application-store';

@Component({
	selector: 'default-layout',
	styleUrl: './default-layout.scss',
	templateUrl: './default-layout.html',
	imports: [RouterModule, AppBar],
})
export class DefaultLayout {
	#store = inject(ApplicationStore);
	#router = inject(Router);
	#navigation = inject(DeviceNavigation);

	devices = this.#store.devices;
	modules = this.#store.modules;

	/**
	 * Read from the URL rather than remembered on activation, so it stays right
	 * after a back/forward or a page opened directly on its address.
	 */
	readonly #url = toSignal(
		this.#router.events.pipe(
			filter((event) => event instanceof NavigationEnd),
			map(() => this.#router.url),
		),
		{ initialValue: this.#router.url },
	);

	/**
	 * The key of the entry being shown, as the application bar expects it:
	 * `/device/mouse/5426-0136` → `5426-0136`, `/module/twinkly` → `twinkly`,
	 * `/dashboard` → undefined, which makes Home the current entry.
	 */
	readonly activeId = computed(() => {
		const segments = this.#url().split('?')[0].split('/').filter(Boolean);
		return segments[0] === 'device' ? segments.at(2) : segments.at(1);
	});

	activateDevice(device: Device): void {
		this.#navigation.open(device);
	}

	activateModule(module: Module): void {
		this.#navigation.openModule(module);
	}

	goHome(): void {
		this.#navigation.home();
	}
}
