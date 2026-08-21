import {
	booleanAttribute,
	ChangeDetectionStrategy,
	Component,
	input,
	model,
	output,
} from '@angular/core';

/**
 * A single line of text, restyled around a real `<input>`.
 *
 * Like every control here it keeps the native element rather than rebuilding
 * it: the caret, selection, undo, autofill, dictation and the mobile keyboard
 * are all things a `<div contenteditable>` would have to reinvent badly.
 *
 * `value` updates on every keystroke, which is what a two-way binding is for.
 * Naming a group is not a per-keystroke command though, so `committed` fires
 * on Enter and on blur, and that is what a caller should send to a backend.
 * The distinction is the whole reason both exist.
 */
@Component({
	selector: 'syn-text-field, label[syn-text-field]',
	templateUrl: './text-field.html',
	styleUrl: './text-field.scss',
	host: {
		'[class.syn-text-field--disabled]': 'disabled()',
	},
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextField {
	/** Two-way, on every keystroke. `valueChange` is the change output. */
	readonly value = model('');

	/**
	 * The value the user settled on — Enter, or leaving the field.
	 *
	 * Escape restores what was there when the field was focused and does not
	 * fire this: abandoning an edit is a thing people expect to be able to do,
	 * and a rename committed on the way out would have no way back.
	 */
	readonly committed = output<string>();

	readonly disabled = input(false, { transform: booleanAttribute });

	/** Shown when the field is empty. Not a label — it disappears when typing. */
	readonly placeholder = input('');

	/** Only needed when the field has no projected label. */
	readonly ariaLabel = input<string | undefined>(undefined);

	/** What the field held when it was focused, so Escape can put it back. */
	#entered = '';

	protected onFocus(): void {
		this.#entered = this.value();
	}

	protected onInput(event: Event): void {
		const target = event.target;
		if (target instanceof HTMLInputElement) this.value.set(target.value);
	}

	protected onBlur(): void {
		if (this.value() !== this.#entered) this.committed.emit(this.value());
	}

	protected onKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter') {
			// Blur commits, so let it: committing here as well would fire twice.
			(event.target as HTMLInputElement).blur();
			return;
		}

		if (event.key === 'Escape') {
			const input = event.target as HTMLInputElement;
			this.value.set(this.#entered);
			// Written straight to the element as well as to the model. The
			// `[value]` binding only writes when the value it last wrote differs,
			// and after typing that memory can still hold the original — so
			// restoring it leaves the model right and the field showing the
			// abandoned text. Caught by the spec beside this file.
			input.value = this.#entered;
			input.blur();
		}
	}
}
