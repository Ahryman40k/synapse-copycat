import { CommonModule } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	inject,
	input,
	untracked,
} from '@angular/core';
import { ApplicationStore } from '../../../core/stores/application-store';
import {
	type DescriptorItem,
	PageBarComponent,
	type PageBarDescriptor,
} from '../../page-bar/page-bar';
import { StripLightingSection } from './lighting/strip-lighting';

/**
 * A light strip — a Twinkly today, whatever answers discovery tomorrow.
 *
 * The same shape as the other device pages, so the dialog treats a strip like
 * a mouse. One thing is its own: the lighting shown is the *device's*, read
 * over the network, so the page asks for it as soon as it knows which strip
 * it is about rather than assuming what a previous visit left in the store.
 */
@Component({
	selector: 'strip-page',
	templateUrl: './strip-page.html',
	styleUrl: './strip-page.scss',
	imports: [CommonModule, PageBarComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StripPage {
	readonly #store = inject(ApplicationStore);

	/** The `:id` route segment, bound by `withComponentInputBinding()`. */
	readonly id = input<string>();

	/**
	 * Resolved once, here, and handed to whichever section is showing —
	 * see `mousemat-page.ts` for why the page owns the answer.
	 */
	protected readonly device = computed(() => this.#store.deviceById(this.id()));

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
			title: 'lighting',
			component: StripLightingSection,
		},
	];

	constructor() {
		// Read, not awaited: the page renders the store's answer immediately
		// and the truth lands when the strip replies. `untracked` because the
		// read patches the store, and a load must not re-run itself.
		effect(() => {
			const id = this.id();
			if (id) untracked(() => void this.#store.getStripLighting(id));
		});
	}

	protected rememberSection(item: DescriptorItem | undefined): void {
		const id = this.id();
		if (id && item) this.#store.setSection(id, item.title);
	}
}
