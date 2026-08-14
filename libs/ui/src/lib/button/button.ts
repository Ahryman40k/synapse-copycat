import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

/**
 * Attribute-only, deliberately.
 *
 * The previous `syn-button` element form produced a custom element with no
 * role, no tab stop, no keyboard activation, no `disabled` and no form
 * participation — everything that makes a button a button. Applying the styles
 * to a real `<button>` (or `<a>` for a link that looks like one) keeps all of
 * it for free, which is the same reasoning as the slider wrapping a native
 * `<input type="range">`.
 *
 * There is no `disabled` input for the same reason: on a `<button>` the native
 * attribute already is the state, and the theme styles `:disabled`. On an `<a>`
 * use `aria-disabled="true"`.
 */
@Component({
	selector: 'button[syn-button], a[syn-button]',
	styleUrl: './button.scss',
	template: '<ng-content />',
	host: {
		'[attr.data-variant]': 'variant()',
	},
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Button {
	/** Read from the theme file as `[data-variant]`. */
	readonly variant = input<ButtonVariant>('primary');
}
