/**
 * A full-size ANSI keyboard, as the Huntsman Elite is.
 *
 * ⚠️ Written here, not read from the device. OpenRazer's matrix is 6×22 — and
 * OpenRGB reports exactly 132 LEDs on that keyboard, which is 6×22 — but the
 * matrix says which cell lights up, never which key sits in it. Physical
 * layout is not something a Razer device reports, so a per-model table is the
 * only source there can be. This one covers ANSI; ISO moves Enter and adds a
 * key, and would need its own.
 *
 * `code` is the `KeyboardEvent.code` of the key, which is what a remapping
 * eventually has to name — it is layout-independent, unlike `key`.
 */
export type KeyCap = {
	code: string;
	label: string;
	/** In key units. 1 is a letter key. */
	width?: number;
};

/** A run of empty space, in the same units. */
export type KeyGap = { gap: number };

export type KeyRow = readonly (KeyCap | KeyGap)[];

export function isGap(cell: KeyCap | KeyGap): cell is KeyGap {
	return 'gap' in cell;
}

const k = (code: string, label: string, width?: number): KeyCap => ({
	code,
	label,
	...(width === undefined ? {} : { width }),
});

const gap = (width: number): KeyGap => ({ gap: width });

export const ANSI_FULL_SIZE: readonly KeyRow[] = [
	[
		k('Escape', 'Esc'),
		gap(1),
		k('F1', 'F1'),
		k('F2', 'F2'),
		k('F3', 'F3'),
		k('F4', 'F4'),
		gap(0.5),
		k('F5', 'F5'),
		k('F6', 'F6'),
		k('F7', 'F7'),
		k('F8', 'F8'),
		gap(0.5),
		k('F9', 'F9'),
		k('F10', 'F10'),
		k('F11', 'F11'),
		k('F12', 'F12'),
		gap(0.25),
		k('PrintScreen', 'PrtSc'),
		k('ScrollLock', 'ScrLk'),
		k('Pause', 'Pause'),
	],
	[
		k('Backquote', '`'),
		k('Digit1', '1'),
		k('Digit2', '2'),
		k('Digit3', '3'),
		k('Digit4', '4'),
		k('Digit5', '5'),
		k('Digit6', '6'),
		k('Digit7', '7'),
		k('Digit8', '8'),
		k('Digit9', '9'),
		k('Digit0', '0'),
		k('Minus', '-'),
		k('Equal', '='),
		k('Backspace', 'Backspace', 2),
		gap(0.25),
		k('Insert', 'Ins'),
		k('Home', 'Home'),
		k('PageUp', 'PgUp'),
		gap(0.25),
		k('NumLock', 'Num'),
		k('NumpadDivide', '/'),
		k('NumpadMultiply', '*'),
		k('NumpadSubtract', '-'),
	],
	[
		k('Tab', 'Tab', 1.5),
		k('KeyQ', 'Q'),
		k('KeyW', 'W'),
		k('KeyE', 'E'),
		k('KeyR', 'R'),
		k('KeyT', 'T'),
		k('KeyY', 'Y'),
		k('KeyU', 'U'),
		k('KeyI', 'I'),
		k('KeyO', 'O'),
		k('KeyP', 'P'),
		k('BracketLeft', '['),
		k('BracketRight', ']'),
		k('Backslash', '\\', 1.5),
		gap(0.25),
		k('Delete', 'Del'),
		k('End', 'End'),
		k('PageDown', 'PgDn'),
		gap(0.25),
		k('Numpad7', '7'),
		k('Numpad8', '8'),
		k('Numpad9', '9'),
		k('NumpadAdd', '+'),
	],
	[
		k('CapsLock', 'Caps', 1.75),
		k('KeyA', 'A'),
		k('KeyS', 'S'),
		k('KeyD', 'D'),
		k('KeyF', 'F'),
		k('KeyG', 'G'),
		k('KeyH', 'H'),
		k('KeyJ', 'J'),
		k('KeyK', 'K'),
		k('KeyL', 'L'),
		k('Semicolon', ';'),
		k('Quote', "'"),
		k('Enter', 'Enter', 2.25),
		gap(3.25),
		k('Numpad4', '4'),
		k('Numpad5', '5'),
		k('Numpad6', '6'),
		gap(1),
	],
	[
		k('ShiftLeft', 'Shift', 2.25),
		k('KeyZ', 'Z'),
		k('KeyX', 'X'),
		k('KeyC', 'C'),
		k('KeyV', 'V'),
		k('KeyB', 'B'),
		k('KeyN', 'N'),
		k('KeyM', 'M'),
		k('Comma', ','),
		k('Period', '.'),
		k('Slash', '/'),
		k('ShiftRight', 'Shift', 2.75),
		gap(1.25),
		k('ArrowUp', '↑'),
		gap(1.25),
		k('Numpad1', '1'),
		k('Numpad2', '2'),
		k('Numpad3', '3'),
		k('NumpadEnter', 'Enter'),
	],
	[
		k('ControlLeft', 'Ctrl', 1.25),
		k('MetaLeft', 'Super', 1.25),
		k('AltLeft', 'Alt', 1.25),
		k('Space', 'Space', 6.25),
		k('AltRight', 'Alt', 1.25),
		k('Fn', 'Fn', 1.25),
		k('ContextMenu', 'Menu', 1.25),
		k('ControlRight', 'Ctrl', 1.25),
		gap(0.25),
		k('ArrowLeft', '←'),
		k('ArrowDown', '↓'),
		k('ArrowRight', '→'),
		gap(0.25),
		k('Numpad0', '0', 2),
		k('NumpadDecimal', '.'),
	],
];

/** Every key of the layout, flattened — the controls a keyboard offers. */
export const ANSI_KEYS: readonly KeyCap[] = ANSI_FULL_SIZE.flatMap((row) =>
	row.filter((cell): cell is KeyCap => !isGap(cell)),
);
