import { NgComponentOutlet } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { ApplicationStore } from '../../../core/stores/application-store';
import {
	type DescriptorItem,
	PageBarComponent,
	type PageBarDescriptor,
} from '../../page-bar/page-bar';
import { CameraCustomizeSection } from './customize/camera-customize';

/**
 * The Kiyo's page. Reached by `device/streaming/:id`, because `streaming` is
 * the kind the contract carries for this line — there is no `camera` kind.
 *
 * One section for now. The bar stays, so a second one costs a line.
 */
@Component({
	selector: 'camera-page',
	templateUrl: './camera-page.html',
	styleUrl: './camera-page.scss',
	imports: [PageBarComponent, NgComponentOutlet],
})
export class CameraPageComponent {
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
	 * The section to open, from what was last read on this device.
	 *
	 * Undefined for a device never opened, and `page-bar` then falls back to
	 * its first tab — which is why nothing has to seed it.
	 */
	protected readonly section = computed(() =>
		this.descriptor.find(
			(item) => item.title === this.#store.sectionFor(this.id()),
		),
	);

	/** What `ngComponentOutlet` hands to the section it renders. */
	protected readonly sectionInputs = computed(() => ({
		device: this.device(),
	}));

	descriptor: PageBarDescriptor = [
		{
			title: 'customize',
			component: CameraCustomizeSection,
		},
	];

	/**
	 * `selected` is a `model<DescriptorItem | undefined>`, so its output can
	 * carry the empty case — the bar clearing its selection rather than moving
	 * it. There is nothing to remember then.
	 */
	protected rememberSection(item: DescriptorItem | undefined): void {
		const id = this.id();
		if (id && item) this.#store.setSection(id, item.title);
	}
}
