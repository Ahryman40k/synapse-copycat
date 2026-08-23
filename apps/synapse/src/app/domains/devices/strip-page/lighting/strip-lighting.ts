import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
} from '@angular/core';
import type { Device } from '@synapse-copycat/backend-api';
import { StripLightingPanel } from '../../../../core/components/strip-lighting-panel/strip-lighting-panel';
import { DeviceLayout } from '../../../../core/layout/device-layout/device-layout';
import { ApplicationStore } from '../../../../core/stores/application-store';

/**
 * The lighting section of the strip page.
 *
 * Thinner than its Razer counterparts on purpose: a strip is not driven by
 * the engine, so there is no effect, no brightness, no "apply to all" — one
 * switch and one colour, written straight to the device through the store.
 */
@Component({
	selector: 'strip-lighting-section',
	templateUrl: './strip-lighting.html',
	imports: [DeviceLayout, StripLightingPanel],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StripLightingSection {
	readonly #store = inject(ApplicationStore);

	/**
	 * Handed down by the page, which owns the route and so owns the answer.
	 * `ngComponentOutlet` sets it, leaving the page-bar descriptor untouched.
	 */
	readonly device = input<Device | undefined>(undefined);

	protected readonly lighting = computed(() =>
		this.#store.stripLightingFor(this.device()?.id),
	);

	protected onPowerChange(on: boolean): void {
		const id = this.device()?.id;
		if (id) this.#store.setStripPower(id, on);
	}

	protected onColorChange(color: string): void {
		const id = this.device()?.id;
		if (id) this.#store.setStripColor(id, color);
	}
}
