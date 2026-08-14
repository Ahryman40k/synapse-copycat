import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { Device, Module } from '@synapse-copycat/backend-api';
import { Card } from '@synapse-copycat/ui';
import { DeviceNavigation } from '../../core/navigation/device-navigation';
import { ApplicationStore } from '../../core/stores/application-store';

@Component({
	selector: 'dashboard-page',
	templateUrl: './dashboard-page.html',
	styleUrl: './dashboard-page.scss',
	imports: [Card],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
	readonly #store = inject(ApplicationStore);
	readonly #navigation = inject(DeviceNavigation);

	protected devices = this.#store.devices;
	protected modules = this.#store.modules;

	/** Same destination as the entry in the application bar. */
	protected open(device: Device): void {
		this.#navigation.open(device);
	}

	protected openModule(module: Module): void {
		this.#navigation.openModule(module);
	}
}
