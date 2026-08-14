import {
	booleanAttribute,
	ChangeDetectionStrategy,
	Component,
	input,
	model,
} from '@angular/core';

/** One entry of the list. `value` is what the model carries. */
export type SelectOption = {
	value: string;
	label: string;
	disabled?: boolean;
};

/**
 * A real `<select>` inside a `<label>`, restyled — not replaced.
 *
 * Rolling a listbox by hand means reimplementing the keyboard (type-ahead,
 * Home/End, arrows), the native picker every mobile and desktop platform
 * provides, and the whole ARIA combobox pattern. The native element does all of
 * it, and `appearance: none` still leaves the closed state fully stylable. Only
 * the open list is the browser's to draw, which is a good trade.
 *
 * Options come through an input rather than projected `<option>` elements: a
 * component's encapsulated styles cannot reach projected content, and the shape
 * of an option is worth typing.
 */
@Component({
	selector: 'syn-select',
	templateUrl: './select.html',
	styleUrl: './select.scss',
	host: {
		'[class.syn-select--disabled]': 'disabled()',
	},
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Select {
	readonly options = input.required<readonly SelectOption[]>();

	/** Two-way. `valueChange` is the change output. */
	readonly value = model<string | undefined>(undefined);

	readonly disabled = input(false, { transform: booleanAttribute });

	/** Only needed when the select has no projected label. */
	readonly ariaLabel = input<string | undefined>(undefined);

	protected onChange(event: Event): void {
		const target = event.target;
		if (target instanceof HTMLSelectElement) this.value.set(target.value);
	}
}
