import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	signal,
} from '@angular/core';

/**
 * A clickable tile — a device on the dashboard, opening its page.
 *
 * Attribute-only, for the same reason as `Button`: the whole surface activates
 * something, so it has to be a real `<button>` (or an `<a>` when it navigates).
 * A custom element gives no role, no tab stop, no Enter/Space, and every one of
 * those would have to be reimplemented, worse.
 *
 * This used to be one component doing two jobs, and every panel in the
 * application inherited its hover lift. The static container is now `syn-panel`.
 *
 * The picture goes through the `image` input rather than being projected. A
 * component's encapsulated styles cannot reach projected content — the emitted
 * rule carries the card's `_ngcontent` attribute while the projected node
 * carries the consumer's — so a projected `<img>` silently kept its intrinsic
 * size and burst out of the card. Owning the media slot is what makes the
 * layout a guarantee instead of a request.
 */
@Component({
	selector: 'button[syn-card], a[syn-card]',
	styleUrl: './card.scss',
	template: `
		@if (shown(); as source) {
			<img
				class="syn-card__media"
				[src]="source"
				[alt]="imageAlt()"
				(error)="onMissing(source)"
			/>
		}
		<ng-content />
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Card {
	readonly image = input<string | undefined>(undefined);

	/**
	 * Sources that failed to load.
	 *
	 * ⚠️ Not every device has a picture in the repository, and the ones that do
	 * are keyed by model — so a peripheral nobody has drawn yet asks for a file
	 * that is not there. Left alone the browser paints its broken-image icon,
	 * which reads as the application having lost something rather than as a
	 * picture that was never there. Dropping the element leaves the card with
	 * its name, which is the truth.
	 *
	 * Kept as a set of sources rather than a boolean so that changing `image`
	 * to something else gets a fair try.
	 */
	private readonly missing = signal<ReadonlySet<string>>(new Set());

	protected readonly shown = computed(() => {
		const source = this.image();
		return source && !this.missing().has(source) ? source : undefined;
	});

	protected onMissing(source: string): void {
		this.missing.update((sources) => new Set(sources).add(source));
	}

	/**
	 * Empty by default: the card's own text already says what it is, so
	 * announcing the picture as well only repeats it. Pass a description when
	 * the image carries information the text does not.
	 */
	readonly imageAlt = input('');
}
