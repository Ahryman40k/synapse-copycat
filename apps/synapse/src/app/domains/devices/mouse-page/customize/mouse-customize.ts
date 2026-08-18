import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	model,
	signal,
} from '@angular/core';
import type { Device } from '@synapse-copycat/backend-api';
import {
	ButtonGroup,
	type ButtonGroupOption,
	Panel,
} from '@synapse-copycat/ui';
import { AssignmentEditor } from '../../../../core/components/assignment-editor/assignment-editor';
import { DeviceLayout } from '../../../../core/layout/device-layout/device-layout';
import {
	type Assignment,
	assignmentOf,
	type BindingLayer,
	type Bindings,
	EMPTY_BINDINGS,
	MOUSE_CONTROLS,
	withAssignment,
} from '../../../../core/models/key-binding';

const LAYERS: readonly ButtonGroupOption[] = [
	{ value: 'default', label: 'Default' },
	{ value: 'hypershift', label: 'Hypershift' },
];

/**
 * Remapping the mouse: pick a control on the left, say what it does on the
 * right.
 *
 * A list rather than numbered hotspots on the photograph, which is what
 * Synapse shows. Hotspots need per-model coordinates — data nothing reports
 * and that would have to be drawn by hand for every mouse. The list is honest,
 * keyboard-reachable for free, and does not close the door: the picture can be
 * added later over the same selection.
 */
@Component({
	selector: 'mouse-customize-section',
	templateUrl: './mouse-customize.html',
	styleUrl: './mouse-customize.scss',
	imports: [DeviceLayout, Panel, ButtonGroup, AssignmentEditor],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MouseCustomizePanelComponent {
	readonly device = input<Device | undefined>(undefined);

	/** Every assignment of every layer. Nothing reaches the device yet. */
	readonly bindings = model<Bindings>(EMPTY_BINDINGS);

	protected readonly controls = MOUSE_CONTROLS;
	protected readonly layers = LAYERS;

	protected readonly layer = signal<BindingLayer>('default');
	protected readonly selectedId = signal<string>(MOUSE_CONTROLS[0].id);

	protected readonly selected = computed(() =>
		this.controls.find((control) => control.id === this.selectedId()),
	);

	protected readonly assignment = computed(() =>
		assignmentOf(this.bindings(), this.layer(), this.selectedId()),
	);

	/** Marks the controls that are no longer on their default, in this layer. */
	protected readonly changed = computed(
		() => new Set(Object.keys(this.bindings()[this.layer()])),
	);

	protected isChanged(id: string): boolean {
		return this.changed().has(id);
	}

	protected onLayerChange(value: string | undefined): void {
		if (value) this.layer.set(value as BindingLayer);
	}

	protected onAssignmentChange(assignment: Assignment): void {
		this.bindings.set(
			withAssignment(
				this.bindings(),
				this.layer(),
				this.selectedId(),
				assignment,
			),
		);
	}
}
