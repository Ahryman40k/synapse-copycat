import {
	booleanAttribute,
	ChangeDetectionStrategy,
	Component,
	input,
	model,
} from '@angular/core';

/** One choice in the group. `value` is what the model carries. */
export type ButtonGroupOption = {
	value: string;
	label: string;
	disabled?: boolean;
};

/** Keeps the radios of several groups on one page from sharing a name. */
let nextId = 0;

/**
 * A row of choices inside one rounded frame, exactly one of them taken.
 *
 * Built on native radios rather than buttons with `aria-pressed`. "One of
 * these" *is* a radio group: the browser then gives the arrow keys, the single
 * tab stop that lands on the current choice, form participation, and the
 * announcement a screen reader expects — "radio group, 2 of 3". A row of
 * buttons has none of that, and reimplementing it is the mistake this library
 * keeps undoing.
 *
 * The inputs are hidden from sight but never from the keyboard or the
 * accessibility tree; each label is the pill you see and the click target.
 */
@Component({
	selector: 'syn-button-group, fieldset[syn-button-group]',
	templateUrl: './button-group.html',
	styleUrl: './button-group.scss',
	host: {
		role: 'radiogroup',
		'[attr.aria-label]': 'ariaLabel()',
		'[class.syn-button-group--disabled]': 'disabled()',
	},
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonGroup {
	readonly options = input.required<readonly ButtonGroupOption[]>();

	/** Two-way. `valueChange` is the change output. */
	readonly value = model<string | undefined>(undefined);

	/** Turns the whole group off; an option can also be disabled on its own. */
	readonly disabled = input(false, { transform: booleanAttribute });

	/** Names the group. A radio group with no name is announced as nothing. */
	readonly ariaLabel = input<string | undefined>(undefined);

	protected readonly name = `syn-button-group-${nextId++}`;

	protected onChange(value: string): void {
		this.value.set(value);
	}
}
