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
import { GamingModePanel } from '../../../../core/components/gaming-mode-panel/gaming-mode-panel';
import { KeyGrid } from '../../../../core/components/key-grid/key-grid';
import { SnapTapPanel } from '../../../../core/components/snap-tap-panel/snap-tap-panel';
import { DeviceLayout } from '../../../../core/layout/device-layout/device-layout';
import {
	type Assignment,
	assignmentOf,
	type BindingLayer,
	type Bindings,
	EMPTY_BINDINGS,
	withAssignment,
} from '../../../../core/models/key-binding';
import { ANSI_KEYS } from '../../../../core/models/keyboard-layout';

const LAYERS: readonly ButtonGroupOption[] = [
	{ value: 'default', label: 'Default' },
	{ value: 'hypershift', label: 'Hypershift' },
];

/**
 * Remapping the keyboard, then gaming mode and snap tap.
 *
 * The key here is picked on a drawn keyboard rather than from a list: 104
 * entries would be unreadable, and a keyboard is the one device whose physical
 * layout everybody already knows how to read.
 */
@Component({
	selector: 'keyboard-customize-section',
	templateUrl: './keyboard-customize.html',
	styleUrl: './keyboard-customize.scss',
	imports: [
		DeviceLayout,
		Panel,
		ButtonGroup,
		KeyGrid,
		AssignmentEditor,
		GamingModePanel,
		SnapTapPanel,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KeyboardCustomizeSection {
	readonly device = input<Device | undefined>(undefined);

	readonly bindings = model<Bindings>(EMPTY_BINDINGS);

	protected readonly layers = LAYERS;
	protected readonly layer = signal<BindingLayer>('default');
	protected readonly selectedCode = signal<string | undefined>(undefined);

	protected readonly selected = computed(() => {
		const code = this.selectedCode();
		const cap = ANSI_KEYS.find((key) => key.code === code);
		return cap ? { id: cap.code, label: cap.label } : undefined;
	});

	protected readonly assignment = computed(() =>
		assignmentOf(this.bindings(), this.layer(), this.selectedCode() ?? ''),
	);

	protected readonly changed = computed(() =>
		Object.keys(this.bindings()[this.layer()]),
	);

	protected onLayerChange(value: string | undefined): void {
		if (value) this.layer.set(value as BindingLayer);
	}

	protected onAssignmentChange(assignment: Assignment): void {
		const code = this.selectedCode();
		if (!code) return;

		this.bindings.set(
			withAssignment(this.bindings(), this.layer(), code, assignment),
		);
	}
}
