import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { DeviceStage } from '../../../core/components/device-stage/device-stage';
import { ApplicationStore } from '../../../core/stores/application-store';
import {
	PageBarComponent,
	type PageBarDescriptor,
} from '../../page-bar/page-bar';
import { MousematLightingPanelComponent } from './lighting/mousemat-lighting';

@Component({
	selector: 'mousemat-page',
	templateUrl: './mousemat-page.html',
	styleUrl: './mousemat-page.scss',
	imports: [CommonModule, PageBarComponent, DeviceStage],
})
export class MousematPageComponent {
	readonly #store = inject(ApplicationStore);

	descriptor: PageBarDescriptor = [
		{
			title: 'lighting',
			component: MousematLightingPanelComponent,
		},
	];

	/**
	 * The `:id` route segment, bound by `withComponentInputBinding()`.
	 *
	 * This replaces a `device = input.required<Device>()` that nothing ever
	 * supplied — neither the route nor the story — so the page had no way to
	 * know which mousemat it was showing.
	 */
	readonly id = input<string>();

	/**
	 * Read from the store rather than resolved, per §5: routes fill the store,
	 * components read the signals.
	 *
	 * ⚠️ Empty on a URL opened directly, because only the dashboard route
	 * resolves the devices. The same gap already leaves the application bar
	 * without entries in that case; it is not this page's to fix.
	 */
	protected readonly device = computed(() =>
		this.#store.devices().find((device) => device.id === this.id()),
	);
}
