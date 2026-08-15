import {
	booleanAttribute,
	ChangeDetectionStrategy,
	Component,
	input,
	model,
} from '@angular/core';

/**
 * A real `<input type="checkbox" role="switch">` inside a `<label>`, restyled.
 *
 * Three things the previous implementation got wrong, all fixed by letting the
 * native element do the work:
 *
 * - the input was `opacity: 0; width: 0; height: 0` and the model was toggled
 *   from a `(click)` on the host, so there was no keyboard path;
 * - `[attr.checked]` sets the HTML *attribute*, which is only the default
 *   state — it diverges from the property as soon as the user interacts;
 * - the `label[syn-switch]` selector meant a native label wrapping the input
 *   toggled it, *and* the host click toggled the model — two toggles cancelling
 *   out. That selector is gone; the component now contains its own label, and
 *   nesting labels is invalid anyway.
 *
 * `role="switch"` makes a screen reader announce on/off rather than
 * checked/unchecked, which is what this control means.
 */
@Component({
	selector: 'syn-switch',
	templateUrl: './switch.html',
	styleUrl: './switch.scss',
	host: {
		'[class.syn-switch--disabled]': 'disabled()',
		'[class.syn-switch--label-before]': "labelPosition() === 'before'",
	},
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SwitchComponent {
	/** Two-way. `checkedChange` is the change output. */
	readonly checked = model(false);

	readonly disabled = input(false, { transform: booleanAttribute });

	/**
	 * Which side of the track the projected label sits on. `before` is for a
	 * row that already reads left to right — a panel heading with its switch at
	 * the far right, where the label belongs with the words, not with the
	 * control.
	 *
	 * It reorders the rendered box, not the DOM: the label stays inside the
	 * `<label>`, so clicking the text still toggles and the association still
	 * holds.
	 */
	readonly labelPosition = input<'before' | 'after'>('after');

	/** Only needed when the switch has no projected label. */
	readonly ariaLabel = input<string | undefined>(undefined);

	protected onChange(event: Event): void {
		const target = event.target;
		if (target instanceof HTMLInputElement) this.checked.set(target.checked);
	}
}
