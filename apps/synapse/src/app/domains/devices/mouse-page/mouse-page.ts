import { NgComponentOutlet } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { Battery } from '@synapse-copycat/ui';
import { ApplicationStore } from '../../../core/stores/application-store';
import {
	PageBarComponent,
	type PageBarDescriptor,
} from '../../page-bar/page-bar';
import { MouseCustomizePanelComponent } from './customize/mouse-customize';
import { MousePerformanceSection } from './performance/mouse-performance';
import { MousePowerSection } from './power/mouse-power';
import { MouseLightingSection } from './lighting/mouse-lighting';

@Component({
	selector: 'mouse-page',
	styleUrl: './mouse-page.scss',
	templateUrl: './mouse-page.html',
	imports: [PageBarComponent, NgComponentOutlet, Battery],
})
export class MousePageComponent {
	readonly #store = inject(ApplicationStore);

	/** The `:id` route segment, bound by `withComponentInputBinding()`. */
	readonly id = input<string>();

	/**
	 * Resolved once, here, and handed to whichever section is showing.
	 *
	 * The sections used to read the device from the store themselves, derived
	 * from the URL. That left the answer to a global each of them looked up
	 * independently — nothing tied it to the page actually rendering. The page
	 * owns the route, so it owns the device, and every section on it is given
	 * the same one in the same pass.
	 *
	 * ⚠️ Undefined on an address opened directly, because only the dashboard
	 * route resolves the devices into the store.
	 */
	protected readonly device = computed(() => this.#store.deviceById(this.id()));

	/**
	 * ⚠️ A stand-in. Nothing reports a battery yet: OpenRazer exposes it as
	 * `razer.device.power` → `getBattery` / `isCharging`, but neither the
	 * `BackendCommands` contract nor the mock carries it, so there is no honest
	 * source to read. Undefined would be the truthful value — this is here to
	 * make the gauge visible while the plumbing is missing, and should go the
	 * moment it lands.
	 */
	protected readonly battery = signal<
		{ level: number; charging: boolean } | undefined
	>({ level: 62, charging: false });

	/** What `ngComponentOutlet` hands to the section it renders. */
	protected readonly sectionInputs = computed(() => ({
		device: this.device(),
	}));

	descriptor: PageBarDescriptor = [
		{
			title: 'customize',
			component: MouseCustomizePanelComponent,
		},
		{
			title: 'performance',
			component: MousePerformanceSection,
		},
		{
			title: 'lighting',
			component: MouseLightingSection,
		},
		// No `calibration`: it tunes the sensor for a given surface, so it
		// belongs to the mousemat rather than here.
		{
			title: 'power',
			component: MousePowerSection,
		},
	];
}
