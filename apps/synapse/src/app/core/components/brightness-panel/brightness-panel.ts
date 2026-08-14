import {
	ChangeDetectionStrategy,
	Component,
	computed,
	model,
} from '@angular/core';
import { Panel, SliderComponent, SwitchComponent } from '@synapse-copycat/ui';

const MAX_BRIGHTNESS_VALUE = 100;

export type BrightnessChange = {
	activated: boolean;
	value: number;
};

@Component({
	selector: 'brightness-panel',
	templateUrl: './brightness-panel.html',
	styleUrl: './brightness-panel.scss',
	imports: [Panel, SwitchComponent, SliderComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrightnessPanelComponent {
	readonly value = model<BrightnessChange>({
		activated: true,
		value: MAX_BRIGHTNESS_VALUE,
	});

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
