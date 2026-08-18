/**
 * What a control can be made to do, and where those choices are kept.
 *
 * Deliberately independent of how an assignment is *applied*. OpenRazer has no
 * remapping interface at all — it is an lighting and settings daemon — so
 * applying these will mean either rewriting input events in user space
 * (evdev + uinput, as `input-remapper` does) or writing them into the device's
 * own firmware the way Synapse does. That decision is still open, and nothing
 * here depends on it.
 */

/** A modifier layer. Holding the hypershift control swaps the whole set. */
export type BindingLayer = 'default' | 'hypershift';

export const BINDING_LAYERS: readonly BindingLayer[] = [
	'default',
	'hypershift',
];

export type MouseAction =
	| 'left'
	| 'right'
	| 'middle'
	| 'scroll-up'
	| 'scroll-down'
	| 'back'
	| 'forward'
	| 'double-click';

/** Ties into the DPI stages of the performance tab. */
export type SensitivityAction = 'stage-up' | 'stage-down' | 'cycle' | 'clutch';

/**
 * A discriminated union rather than a bag of optional fields: an assignment is
 * exactly one thing, and the compiler should say so. It is also the shape a
 * valibot schema will validate once these cross a boundary.
 */
export type Assignment =
	| { kind: 'default' }
	| { kind: 'disabled' }
	| { kind: 'keyboard'; keys: string }
	| { kind: 'mouse'; action: MouseAction }
	| { kind: 'sensitivity'; action: SensitivityAction }
	| { kind: 'text'; text: string };

export type AssignmentKind = Assignment['kind'];

export const DEFAULT_ASSIGNMENT: Assignment = { kind: 'default' };

/** One thing the user can press: a mouse button, or a key. */
export type Control = {
	id: string;
	label: string;
};

/**
 * Every control's assignment, per layer.
 *
 * A control absent from the map is on its default, which is why the map starts
 * empty rather than pre-filled with every control.
 */
export type Bindings = Record<BindingLayer, Record<string, Assignment>>;

export const EMPTY_BINDINGS: Bindings = { default: {}, hypershift: {} };

export function assignmentOf(
	bindings: Bindings,
	layer: BindingLayer,
	controlId: string,
): Assignment {
	return bindings[layer][controlId] ?? DEFAULT_ASSIGNMENT;
}

export function withAssignment(
	bindings: Bindings,
	layer: BindingLayer,
	controlId: string,
	assignment: Assignment,
): Bindings {
	const layerBindings = { ...bindings[layer] };

	// A default is the absence of an assignment, not an assignment of its own:
	// storing it would make "has been changed" impossible to tell.
	if (assignment.kind === 'default') delete layerBindings[controlId];
	else layerBindings[controlId] = assignment;

	return { ...bindings, [layer]: layerBindings };
}

/**
 * ⚠️ One list for every mouse. The real set belongs to the device — a Basilisk
 * has a sniper button a DeathAdder does not — but nothing reports it yet, so
 * this is the common denominator plus the two the Basilisk adds.
 */
export const MOUSE_CONTROLS: readonly Control[] = [
	{ id: 'left', label: 'Left click' },
	{ id: 'right', label: 'Right click' },
	{ id: 'middle', label: 'Scroll click' },
	{ id: 'scroll-up', label: 'Scroll up' },
	{ id: 'scroll-down', label: 'Scroll down' },
	{ id: 'button-4', label: 'Back' },
	{ id: 'button-5', label: 'Forward' },
	{ id: 'clutch', label: 'Sensitivity clutch' },
];
