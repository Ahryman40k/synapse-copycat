import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ApplicationStore } from '../core/stores/application-store';
import { AppBar } from '../appbar/appbar';

@Component({
	selector: 'dashboard-page',
	templateUrl: './dashboard-page.html',
	styleUrl: './dashboard-page.scss',
	imports: [CommonModule, AppBar],
})
export class DashboardPage {
	readonly #store = inject(ApplicationStore);

	protected devices = this.#store.devices;
	protected modules = this.#store.modules;
}
