import { ChangeDetectionStrategy, Component, input } from '@angular/core';

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
		@if (image()) {
			<img class="syn-card__media" [src]="image()" [alt]="imageAlt()" />
		}
		<ng-content />
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Card {
	readonly image = input<string | undefined>(undefined);

	/**
	 * Empty by default: the card's own text already says what it is, so
	 * announcing the picture as well only repeats it. Pass a description when
	 * the image carries information the text does not.
	 */
	readonly imageAlt = input('');
}
