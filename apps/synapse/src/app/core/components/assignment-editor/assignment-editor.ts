import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	model,
} from '@angular/core';
import {
	KeyCapture,
	Panel,
	Select,
	type SelectOption,
} from '@synapse-copycat/ui';
import {
	type Assignment,
	type AssignmentKind,
	type Control,
	DEFAULT_ASSIGNMENT,
	type MouseAction,
	type SensitivityAction,
} from '../../models/key-binding';

const KINDS: readonly SelectOption[] = [
	{ value: 'default', label: 'Default' },
	{ value: 'keyboard', label: 'Keyboard function' },
	{ value: 'mouse', label: 'Mouse function' },
	{ value: 'sensitivity', label: 'Sensitivity' },
	{ value: 'text', label: 'Text function' },
	{ value: 'disabled', label: 'Disable' },
];

const MOUSE_ACTIONS: readonly SelectOption[] = [
	{ value: 'left', label: 'Left click' },
	{ value: 'right', label: 'Right click' },
	{ value: 'middle', label: 'Scroll click' },
	{ value: 'scroll-up', label: 'Scroll up' },
	{ value: 'scroll-down', label: 'Scroll down' },
	{ value: 'back', label: 'Back' },
	{ value: 'forward', label: 'Forward' },
	{ value: 'double-click', label: 'Double click' },
];

const SENSITIVITY_ACTIONS: readonly SelectOption[] = [
	{ value: 'stage-up', label: 'Next stage' },
	{ value: 'stage-down', label: 'Previous stage' },
	{ value: 'cycle', label: 'Cycle stages' },
	{ value: 'clutch', label: 'Sensitivity clutch (hold)' },
];

/**
 * What the selected control does, and the editor for it.
 *
 * Changing the category replaces the assignment rather than merging into it:
 * the union has one shape per kind, so there is nothing to carry across.
 */
@Component({
	selector: 'assignment-editor',
	templateUrl: './assignment-editor.html',
	styleUrl: './assignment-editor.scss',
	imports: [Panel, Select, KeyCapture],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssignmentEditor {
	/** Undefined until something is picked on the left. */
	readonly control = input<Control | undefined>(undefined);

	readonly assignment = model<Assignment>(DEFAULT_ASSIGNMENT);

	protected readonly kinds = KINDS;
	protected readonly mouseActions = MOUSE_ACTIONS;
	protected readonly sensitivityActions = SENSITIVITY_ACTIONS;

	protected readonly kind = computed<AssignmentKind>(
		() => this.assignment().kind,
	);

	protected readonly keys = computed(() => {
		const assignment = this.assignment();
		return assignment.kind === 'keyboard' ? assignment.keys : '';
	});

	protected readonly mouseAction = computed(() => {
		const assignment = this.assignment();
		return assignment.kind === 'mouse' ? assignment.action : 'left';
	});

	protected readonly sensitivityAction = computed(() => {
		const assignment = this.assignment();
		return assignment.kind === 'sensitivity' ? assignment.action : 'stage-up';
	});

	protected readonly text = computed(() => {
		const assignment = this.assignment();
		return assignment.kind === 'text' ? assignment.text : '';
	});

	protected onKindChange(value: string | undefined): void {
		switch (value as AssignmentKind) {
			case 'keyboard':
				this.assignment.set({ kind: 'keyboard', keys: this.keys() });
				break;
			case 'mouse':
				this.assignment.set({ kind: 'mouse', action: this.mouseAction() });
				break;
			case 'sensitivity':
				this.assignment.set({
					kind: 'sensitivity',
					action: this.sensitivityAction(),
				});
				break;
			case 'text':
				this.assignment.set({ kind: 'text', text: this.text() });
				break;
			case 'disabled':
				this.assignment.set({ kind: 'disabled' });
				break;
			default:
				this.assignment.set(DEFAULT_ASSIGNMENT);
		}
	}

	protected onKeysChange(keys: string): void {
		this.assignment.set({ kind: 'keyboard', keys });
	}

	protected onMouseActionChange(value: string | undefined): void {
		if (value) {
			this.assignment.set({ kind: 'mouse', action: value as MouseAction });
		}
	}

	protected onSensitivityActionChange(value: string | undefined): void {
		if (value) {
			this.assignment.set({
				kind: 'sensitivity',
				action: value as SensitivityAction,
			});
		}
	}

	protected onTextChange(event: Event): void {
		const target = event.target;
		if (target instanceof HTMLInputElement) {
			this.assignment.set({ kind: 'text', text: target.value });
		}
	}
}
