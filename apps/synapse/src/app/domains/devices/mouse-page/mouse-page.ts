import { NgComponentOutlet } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { ApplicationStore } from '../../../core/stores/application-store';
import {
	PageBarComponent,
	type PageBarDescriptor,
} from '../../page-bar/page-bar';
import { MouseCustomizePanelComponent } from './customize/mouse-customize';
import { MouseLightingSection } from './lighting/mouse-lighting';

@Component({
	selector: 'mouse-page',
	styleUrl: './mouse-page.scss',
	templateUrl: './mouse-page.html',
	imports: [PageBarComponent, NgComponentOutlet],
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
			component: MouseLightingSection,
		},
		{
			title: 'lighting',
			component: MouseLightingSection,
		},
		{
			title: 'calibration',
			component: MouseLightingSection,
		},
		{
			title: 'power',
			component: MouseLightingSection,
		},
	];
}
