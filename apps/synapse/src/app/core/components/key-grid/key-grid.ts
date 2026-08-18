import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	model,
} from '@angular/core';
import {
	ANSI_FULL_SIZE,
	isGap,
	type KeyCap,
	type KeyGap,
	type KeyRow,
} from '../../models/keyboard-layout';

/** Width of one key unit. Fixed, so no custom property crosses a boundary. */
const UNIT_REM = 2.1;

/** Distinguishes the radios of several grids on one page. */
let nextId = 0;

/**
 * The keyboard, drawn to scale, one key selectable at a time.
 *
 * Native radios again, as in `syn-button-group`: with 104 keys the single tab
 * stop matters more than anywhere else in the application — a row of buttons
 * would take 104 presses to cross.
 */
@Component({
	selector: 'key-grid',
	templateUrl: './key-grid.html',
	styleUrl: './key-grid.scss',
	host: {
		role: 'radiogroup',
		'[attr.aria-label]': 'ariaLabel()',
	},
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KeyGrid {
	readonly rows = input<readonly KeyRow[]>(ANSI_FULL_SIZE);

	/** The `KeyboardEvent.code` of the selected key. */
	readonly selected = model<string | undefined>(undefined);

	/** Codes that are no longer on their default, marked with a dot. */
	readonly changed = input<readonly string[]>([]);

	readonly ariaLabel = input('Keyboard keys');

	protected readonly name = `key-grid-${nextId++}`;

	readonly #changed = computed(() => new Set(this.changed()));

	protected isGap = isGap;

	protected width(cell: KeyCap | KeyGap): number {
		return (isGap(cell) ? cell.gap : (cell.width ?? 1)) * UNIT_REM;
	}

	protected isChanged(code: string): boolean {
		return this.#changed().has(code);
	}

	protected onChange(code: string): void {
		this.selected.set(code);
	}
}
