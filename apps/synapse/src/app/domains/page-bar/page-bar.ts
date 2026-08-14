import { DOCUMENT } from '@angular/common';
import {
	ApplicationRef,
	ChangeDetectionStrategy,
	Component,
	computed,
	type ElementRef,
	inject,
	input,
	model,
	output,
	type Type,
	viewChildren,
} from '@angular/core';

/**
 * Shared by every bar so the animation can be tuned from one place in CSS. A
 * view-transition name must be unique in the document, so this assumes a single
 * page bar per page — which is what a device page has. With two, the browser
 * aborts the transition and the change is simply instant.
 */
const ACTIVE_TAB_TRANSITION = 'syn-page-bar-active';

export type DescriptorItem = {
	title: string;
	component: Type<unknown>;
};
export type PageBarDescriptor = DescriptorItem[];

/** Distinguishes the ids of several bars on one page. */
let nextId = 0;

/**
 * The tab bar of a device page.
 *
 * It is a WAI-ARIA tablist, not a row of buttons: `role="tab"`,
 * `aria-selected`, a roving tabindex, and Arrow/Home/End to move between tabs.
 * A plain button row gives a screen-reader user no idea how many tabs there
 * are or which one is current, and forces a Tab press per tab to cross the bar.
 *
 * It also owns the selection now. Previously it only emitted `panelChanging`
 * and the page kept `selectedPanel` to itself, so the bar could not mark the
 * active tab — there was no visual indication of where you were.
 *
 * The panel is rendered by the page, so the page has to close the loop:
 *
 *   <page-bar #bar [descriptor]="descriptor" [(selected)]="panel" />
 *   <div role="tabpanel" [id]="bar.activePanelId()"
 *        [attr.aria-labelledby]="bar.activeTabId()">…</div>
 */
@Component({
	selector: 'page-bar',
	styleUrl: './page-bar.scss',
	templateUrl: './page-bar.html',
	host: {
		role: 'tablist',
		'[attr.aria-label]': 'ariaLabel()',
	},
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageBarComponent {
	readonly #id = `page-bar-${nextId++}`;
	readonly #document = inject(DOCUMENT);
	readonly #appRef = inject(ApplicationRef);

	/** Bound on the active tab only — the pill the browser morphs. */
	protected readonly transitionName = ACTIVE_TAB_TRANSITION;

	readonly descriptor = input.required<PageBarDescriptor>();

	readonly ariaLabel = input('Sections');

	/** Two-way. Falls back to the first item until something is chosen. */
	readonly selected = model<DescriptorItem | undefined>(undefined);

	/** Kept beside `selected` so existing one-way consumers still work. */
	readonly panelChanging = output<DescriptorItem>();

	private readonly tabs =
		viewChildren<ElementRef<HTMLButtonElement>>('tabButton');

	/**
	 * The section currently shown. Public so a page can render its panel from
	 * it — the bar is the single source of truth, rather than every page
	 * keeping a copy of the selection in sync by hand.
	 */
	readonly activeItem = computed(() => this.selected() ?? this.descriptor()[0]);

	protected readonly activeIndex = computed(() =>
		this.descriptor().indexOf(this.activeItem()),
	);

	protected tabId = (index: number): string => `${this.#id}-tab-${index}`;
	protected panelId = (index: number): string => `${this.#id}-panel-${index}`;

	/** For the page to label its panel — see the class comment. */
	readonly activeTabId = computed(() => this.tabId(this.activeIndex()));
	readonly activePanelId = computed(() => this.panelId(this.activeIndex()));

	protected select(item: DescriptorItem): void {
		this.#withViewTransition(() => {
			this.selected.set(item);
			this.panelChanging.emit(item);
		});
	}

	/**
	 * Slide the pill from the old tab to the new one.
	 *
	 * A view transition rather than an absolutely positioned indicator moved by
	 * hand: the bar wraps onto several rows, and a single translated element
	 * cannot follow the pill across a line break. The browser morphs between the
	 * two rendered states instead, so position, size and the label's colour
	 * change are all handled.
	 *
	 * The callback must mutate the DOM synchronously, hence `tick()` — setting
	 * a signal alone only schedules change detection.
	 */
	#withViewTransition(change: () => void): void {
		const start = this.#document.startViewTransition?.bind(this.#document);

		// Not supported — Tauri's WebKitGTK may be behind — or the user asked for
		// less motion. Either way the change still happens, just instantly.
		if (!start || this.#prefersReducedMotion()) {
			change();
			return;
		}

		start(() => {
			change();
			this.#appRef.tick();
		});
	}

	#prefersReducedMotion(): boolean {
		return (
			this.#document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)')
				.matches ?? false
		);
	}

	/**
	 * Arrow keys move and activate in one gesture — the pattern's automatic
	 * activation mode, which suits panels that are cheap to render.
	 */
	protected onKeydown(event: KeyboardEvent, index: number): void {
		const items = this.descriptor();
		if (items.length === 0) return;

		const target = {
			ArrowRight: (index + 1) % items.length,
			ArrowLeft: (index - 1 + items.length) % items.length,
			Home: 0,
			End: items.length - 1,
		}[event.key];

		if (target === undefined) return;

		event.preventDefault();
		this.select(items[target]);
		this.tabs()[target]?.nativeElement.focus();
	}
}
