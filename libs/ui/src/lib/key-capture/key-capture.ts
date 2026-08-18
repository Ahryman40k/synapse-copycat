import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	model,
	signal,
} from '@angular/core';

/** Reading order, so `Ctrl + Alt + K` never comes out as `Alt + Ctrl + K`. */
const MODIFIERS = [
	['ctrlKey', 'Ctrl'],
	['altKey', 'Alt'],
	['shiftKey', 'Shift'],
	['metaKey', 'Super'],
] as const;

/** Pressed on their own these are not a combination, just a prefix. */
const MODIFIER_KEYS = new Set(['Control', 'Alt', 'Shift', 'Meta', 'AltGraph']);

/** `KeyA` -> `A`, `Digit1` -> `1`, `ArrowUp` -> `Up`. */
function nameOf(event: KeyboardEvent): string {
	const code = event.code;

	if (code.startsWith('Key')) return code.slice(3);
	if (code.startsWith('Digit')) return code.slice(5);
	if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`;
	if (code.startsWith('Arrow')) return code.slice(5);

	return code || event.key;
}

/**
 * Turns a key press into the text of the combination.
 *
 * Exported so it can be tested for what it is — event handling — without a
 * component around it.
 */
export function describeCombination(event: KeyboardEvent): string | undefined {
	// Still building it: the user is holding Ctrl and has not chosen a key.
	if (MODIFIER_KEYS.has(event.key)) return undefined;

	const parts = MODIFIERS.filter(([flag]) => event[flag]).map(
		([, label]) => label,
	);

	return [...parts, nameOf(event)].join(' + ');
}

/**
 * A field that records a key combination instead of being typed into.
 *
 * A real `<button>`, so it is reachable, pressable with Space or Enter, and
 * announced as a control. It captures only while armed — otherwise it would
 * swallow every keystroke on the page, including the ones meant to leave it.
 */
@Component({
	selector: 'syn-key-capture',
	templateUrl: './key-capture.html',
	styleUrl: './key-capture.scss',
	host: {
		'[class.syn-key-capture--recording]': 'recording()',
	},
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KeyCapture {
	/** Two-way. The combination as text, empty when nothing is set. */
	readonly value = model('');

	readonly ariaLabel = input('Key combination');

	protected readonly recording = signal(false);

	protected readonly display = computed(() => {
		if (this.recording()) return 'Press a key…';
		return this.value() || 'Not set';
	});

	protected arm(): void {
		this.recording.set(true);
	}

	protected disarm(): void {
		this.recording.set(false);
	}

	protected onKeydown(event: KeyboardEvent): void {
		if (!this.recording()) return;

		// Everything is ours while armed, or Tab and Enter would leave instead of
		// being recorded — which is the whole point of a capture field.
		event.preventDefault();
		event.stopPropagation();

		if (event.key === 'Escape') {
			this.disarm();
			return;
		}

		const combination = describeCombination(event);
		if (!combination) return;

		this.value.set(combination);
		this.disarm();
	}

	protected clear(event: Event): void {
		event.stopPropagation();
		this.value.set('');
		this.disarm();
	}
}
