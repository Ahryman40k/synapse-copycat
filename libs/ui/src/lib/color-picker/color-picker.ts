import {
	booleanAttribute,
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	model,
} from '@angular/core';

/** Keeps the labels of several pickers on one page pointing at their own input. */
let nextId = 0;

/**
 * A real `<input type="color">` inside a `<label>`, framed — not replaced.
 *
 * The same trade the select makes: the swatch is ours to paint, the picker
 * itself belongs to the platform. Rolling one by hand means reimplementing a
 * colour wheel, the eyedropper every desktop provides, and the recent-colours
 * list — while losing the keyboard and the accessible name that come free here.
 *
 * The hex is shown beside the swatch because a colour with no name is hard to
 * report, copy or compare; it is marked `aria-hidden` since the input already
 * carries that value in the accessibility tree.
 */
@Component({
	selector: 'syn-color-picker, label[syn-color-picker]',
	templateUrl: './color-picker.html',
	styleUrl: './color-picker.scss',
	host: {
		'[class.syn-color-picker--disabled]': 'disabled()',
		'[class.syn-color-picker--empty]': 'value() === undefined',
	},
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorPicker {
	/**
	 * Two-way. `valueChange` is the change output.
	 *
	 * `#rrggbb` — the only form `<input type="color">` accepts, and the one the
	 * theming palette expects. Anything shorter is silently read as black.
	 *
	 * `undefined` is *no colour chosen*, which the native input cannot hold: it
	 * always reports a value, black by default. So the empty state is ours to
	 * draw — a chequerboard behind the swatch — and only `clearable` can return
	 * to it.
	 */
	readonly value = model<string | undefined>(undefined);

	readonly disabled = input(false, { transform: booleanAttribute });

	/**
	 * Offers a way back to *no colour*. Without it, choosing one is a one-way
	 * door: the native picker has no empty entry to pick.
	 */
	readonly clearable = input(false, { transform: booleanAttribute });

	/** Only needed when the picker has no projected label. */
	readonly ariaLabel = input<string | undefined>(undefined);

	protected readonly id = `syn-color-picker-${nextId++}`;

	/** What the native input shows while nothing is chosen. */
	protected readonly shown = computed(() => this.value() ?? '#000000');

	/**
	 * `input`, not `change`: the colour is applied live while the picker is open,
	 * so what is on screen is what the device would show. `change` alone would
	 * leave the interface behind until the dialog is dismissed.
	 */
	protected onInput(event: Event): void {
		const target = event.target;
		if (target instanceof HTMLInputElement) this.value.set(target.value);
	}

	protected clear(): void {
		this.value.set(undefined);
	}
}
