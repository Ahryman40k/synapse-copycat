import {
	booleanAttribute,
	ChangeDetectionStrategy,
	Component,
	input,
	model,
} from '@angular/core';

/**
 * A real `<input type="checkbox">` inside a `<label>`, restyled — not replaced.
 *
 * The previous implementation set `display: none` on the input and toggled the
 * model from a `(click)` on the host. That removes the control from the tab
 * order *and* from the accessibility tree: unreachable by keyboard, invisible
 * to a screen reader. Everything below — the tab stop, Space to toggle,
 * `:checked`, `:disabled`, the label click target, the announced role — comes
 * from the native element. There is no toggle handler at all; the browser does
 * it, and `(change)` only mirrors the result into the model.
 */
@Component({
	selector: 'syn-checkbox',
	templateUrl: './checkbox.html',
	styleUrl: './checkbox.scss',
	host: {
		'[class.syn-checkbox--disabled]': 'disabled()',
	},
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckboxComponent {
	/** Two-way. `checkedChange` is the change output. */
	readonly checked = model(false);

	readonly disabled = input(false, { transform: booleanAttribute });

	/**
	 * Partial selection — a "select all" reflecting a mixed set. A DOM property,
	 * not an attribute, so it is bound as `[indeterminate]`.
	 */
	readonly indeterminate = input(false, { transform: booleanAttribute });

	/** Only needed when the checkbox has no projected label. */
	readonly ariaLabel = input<string | undefined>(undefined);

	protected onChange(event: Event): void {
		const target = event.target;
		if (target instanceof HTMLInputElement) this.checked.set(target.checked);
	}
}
