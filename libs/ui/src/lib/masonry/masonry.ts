import {
	afterNextRender,
	Directive,
	ElementRef,
	inject,
	type OnDestroy,
} from '@angular/core';

/**
 * Turns a CSS grid into a masonry: every item packs against the bottom of the
 * one above it in its own column, instead of against the tallest item in its
 * row.
 *
 * **Why this is code and not a stylesheet.** A grid row is as tall as its
 * tallest item, which couples panels that have nothing to do with each other —
 * a control appearing in one pushes its neighbour's neighbour down the page.
 * CSS has an answer, `grid-template-rows: masonry`, and no engine ships it:
 * probed here, Chromium supports neither it nor the `item-flow` shorthand that
 * replaced it in the working draft, and WebKit — which is what Tauri renders
 * with on Linux — is no further ahead. So the height has to be measured.
 *
 * **How.** The grid is given rows one pixel tall; each item is then placed
 * outright — the column from its index, wrapping round, and the row from a
 * running tally of what that column already holds. It spans as many rows as it
 * is tall, plus the gap.
 *
 * Both halves are placed on purpose. Left to auto-placement an item drops into
 * whichever column is *shortest*, which is textbook masonry and is unstable
 * when a panel changes height: measured here, growing one panel moved its
 * neighbour into the other column entirely. And pinning only the column is not
 * enough either — the auto-placement cursor only moves forward, so an item is
 * put below it rather than in the gap it could have filled higher up. Both
 * were caught by `masonry.stories.ts`, in a real browser.
 *
 * Pinning by index gives ragged bottoms — the honest look of a masonry — and
 * nothing ever changes column unless the column count does.
 *
 * **What it needs from you, and what it brings itself.** The three declarations
 * that make the measuring work — the one-pixel rows to count in, no row gap
 * because the gap travels inside each span, and no stretching, since an item
 * filling its row would measure the row rather than itself — are this
 * directive's own machinery, not a design choice, so it sets them on its host.
 * Left in the consumer's stylesheet they were a contract nothing enforced:
 * dropping one broke the packing with no error, only a wrong answer.
 *
 * What stays yours is the layout: `display: grid`, how many columns, and the
 * gap between them.
 *
 * ```html
 * <div class="panels" synMasonry>…</div>
 * ```
 * ```scss
 * .panels {
 *   display: grid;
 *   grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
 *   column-gap: 1em;
 * }
 * ```
 *
 * The vertical gap is taken from `column-gap`, so the two stay equal without a
 * second number to keep in sync.
 */
@Directive({
	selector: '[synMasonry]',
	host: {
		'[style.grid-auto-rows.px]': 'unit',
		'[style.row-gap.px]': '0',
		'[style.align-items]': '"start"',
	},
})
export class Masonry implements OnDestroy {
	/**
	 * The row height every span is counted in, in pixels.
	 *
	 * One pixel: the span is then the item's height rounded up, and the rounding
	 * error can never exceed a pixel. Read by the host binding above, so the
	 * value the grid uses and the value the maths uses are the same one.
	 */
	protected readonly unit = 1;

	readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

	#sizes?: ResizeObserver;
	#children?: MutationObserver;

	/** Last values written per item, so a no-op never touches the DOM. */
	readonly #rows = new WeakMap<HTMLElement, string>();
	readonly #columns = new WeakMap<HTMLElement, number>();

	constructor() {
		// `ResizeObserver` is absent from jsdom, where there is nothing to lay
		// out anyway: every measurement there is 0. The grid then renders as an
		// ordinary one, which is also the right answer with scripting off.
		afterNextRender(() => {
			if (typeof ResizeObserver === 'undefined') return;
			this.#start();
		});
	}

	ngOnDestroy(): void {
		this.#sizes?.disconnect();
		this.#children?.disconnect();
	}

	#start(): void {
		const host = this.#host.nativeElement;

		this.#sizes = new ResizeObserver(() => this.#layout());
		this.#sizes.observe(host);

		// Panels are projected, so the set of them changes as an effect is
		// chosen — a new one has to be measured, not just the ones seen once.
		this.#children = new MutationObserver(() => this.#observeChildren());
		this.#children.observe(host, { childList: true });

		this.#observeChildren();
	}

	#observeChildren(): void {
		for (const child of this.#items()) this.#sizes?.observe(child);
		this.#layout();
	}

	#items(): HTMLElement[] {
		return [...this.#host.nativeElement.children].filter(
			(child): child is HTMLElement => child instanceof HTMLElement,
		);
	}

	#layout(): void {
		const host = this.#host.nativeElement;
		const styles = getComputedStyle(host);
		const gap = Number.parseFloat(styles.columnGap) || 0;

		// The computed value is the used track list — "685px 685px" — so its
		// length is how many columns the container settled on at this width.
		const columns = Math.max(1, styles.gridTemplateColumns.split(' ').length);

		const items = this.#items();

		// The next free row in each column, 1-based.
		//
		// Both the row and the column are placed here, and the row is the half
		// that is easy to think you can leave to the grid. You cannot: the
		// auto-placement cursor only ever moves forward, so an item pinned to a
		// column it could have joined higher up is put *below* the cursor
		// instead. Measured, that left the fourth item 96px under a neighbour it
		// should have sat 16px under.
		const next = Array.from({ length: columns }, () => 1);

		items.forEach((item, index) => {
			const height = item.getBoundingClientRect().height;
			const column = index % columns;

			// The gap lives inside the span, so the last item of a column must not
			// carry one — it would hang below the grid as phantom space.
			const last = index + columns >= items.length;
			const room = height === 0 ? 0 : height + (last ? 0 : gap);
			const span = Math.max(1, Math.ceil(room / this.unit));

			const row = next[column];
			next[column] += span;

			// Writing an unchanged value would resize nothing, but it still feeds
			// the observer that called us — this is what keeps that loop shut.
			const placement = `${row} / span ${span}`;
			if (
				this.#rows.get(item) === placement &&
				this.#columns.get(item) === column
			) {
				return;
			}
			this.#rows.set(item, placement);
			this.#columns.set(item, column);

			item.style.gridRow = placement;
			item.style.gridColumn = `${column + 1}`;
		});
	}
}
