import {
	ChangeDetectionStrategy,
	Component,
	computed,
	model,
} from '@angular/core';
import {
	CheckboxComponent,
	Panel,
	SliderComponent,
	SwitchComponent,
} from '@synapse-copycat/ui';
import {
	BRIGHTNESS_DEFAULT,
	type BrightnessChange,
} from '../../models/lighting';

export type { BrightnessChange };

@Component({
	selector: 'brightness-panel',
	templateUrl: './brightness-panel.html',
	styleUrl: './brightness-panel.scss',
	imports: [Panel, SwitchComponent, SliderComponent, CheckboxComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrightnessPanelComponent {
	readonly value = model<BrightnessChange>(BRIGHTNESS_DEFAULT);

	/**
	 * A mode, not an action: while it is on, the brightness set here is the
	 * brightness of every device. Held by the store, so ticking it on one
	 * device shows it ticked on the next.
	 */
	readonly applyToAll = model(false);

	/** Split out so the template reads the state rather than destructuring it. */
	protected readonly activated = computed(() => this.value().activated);
	protected readonly level = computed(() => this.value().value);

	protected onValueChange(value: number): void {
		const current = this.value();
		this.value.set({ ...current, value });
	}

	protected onStateChange(activated: boolean): void {
		const current = this.value();
		this.value.set({ ...current, activated });
	}
}
