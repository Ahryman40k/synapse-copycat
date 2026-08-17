import {
	ChangeDetectionStrategy,
	Component,
	computed,
	model,
} from '@angular/core';
import { Panel, SliderComponent, SwitchComponent } from '@synapse-copycat/ui';

/** What the sensor can be asked for, whatever the mouse. */
export const DPI_MIN = 100;
export const DPI_MAX = 20000;

/** Coarse enough to drag, fine enough for every default below. */
export const DPI_STEP = 50;

export const SENSITIVITY_STAGES_DEFAULT = [850, 1800, 4000, 9700, 20000];

export type Sensitivity = {
	/** Whether the mouse cycles between stages or holds a single value. */
	staged: boolean;
	/** The single value, used while `staged` is false. */
	dpi: number;
	/** The five stages, ascending, used while `staged` is true. */
	stages: number[];
};

export const SENSITIVITY_DEFAULT: Sensitivity = {
	staged: false,
	dpi: 9700,
	stages: SENSITIVITY_STAGES_DEFAULT,
};

@Component({
	selector: 'sensitivity-panel',
	templateUrl: './sensitivity-panel.html',
	styleUrl: './sensitivity-panel.scss',
	imports: [Panel, SliderComponent, SwitchComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SensitivityPanel {
	readonly value = model<Sensitivity>(SENSITIVITY_DEFAULT);

	protected readonly min = DPI_MIN;
	protected readonly max = DPI_MAX;
	protected readonly step = DPI_STEP;

	protected readonly staged = computed(() => this.value().staged);
	protected readonly dpi = computed(() => this.value().dpi);

	/**
	 * Each stage with the room its thumb has to move in: no lower than the
	 * stage below it, no higher than the one above.
	 *
	 * These are travel limits, not the scale — every stage still spans the
	 * sensor's whole range, so the same position means the same DPI on all
	 * five and they can be read against each other.
	 *
	 * The limits are mutual, so the five can never cross: a stage cannot be
	 * dragged past a neighbour, and the neighbour cannot be dragged under it
	 * either. Nothing needs re-clamping after a move.
	 */
	protected readonly stages = computed(() => {
		const values = this.value().stages;

		return values.map((dpi, index) => ({
			index,
			dpi,
			min: index === 0 ? DPI_MIN : values[index - 1],
			max: index === values.length - 1 ? DPI_MAX : values[index + 1],
		}));
	});

	protected onStagedChange(staged: boolean): void {
		this.value.set({ ...this.value(), staged });
	}

	protected onDpiChange(dpi: number): void {
		this.value.set({ ...this.value(), dpi });
	}

	protected onStageChange(index: number, dpi: number): void {
		const stages = [...this.value().stages];
		stages[index] = dpi;
		this.value.set({ ...this.value(), stages });
	}
}
