import {
	ChangeDetectionStrategy,
	Component,
	computed,
	model,
} from '@angular/core';
import {
	ButtonGroup,
	type ButtonGroupOption,
	Panel,
} from '@synapse-copycat/ui';

/** Hertz. What the mouse reports its position at. */
export const POLLING_RATES = [125, 500, 1000] as const;

export type PollingRate = (typeof POLLING_RATES)[number];

@Component({
	selector: 'polling-rate-panel',
	templateUrl: './polling-rate-panel.html',
	styleUrl: './polling-rate-panel.scss',
	imports: [Panel, ButtonGroup],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PollingRatePanel {
	/** Two-way. `rateChange` is the change output. */
	readonly rate = model<PollingRate>(1000);

	/** The group speaks in strings; the rate is a number. */
	protected readonly options: ButtonGroupOption[] = POLLING_RATES.map(
		(rate) => ({ value: String(rate), label: `${rate} Hz` }),
	);

	protected readonly selected = computed(() => String(this.rate()));

	protected onChange(value: string | undefined): void {
		if (value) this.rate.set(Number(value) as PollingRate);
	}
}
