import { Component, model, output } from '@angular/core';
import { Card, SliderComponent, SwitchComponent } from '@synapse-copycat/ui';

const MAX_BRIGHTNESS_VALUE = 100;

export type BrightnessChange = {
	activated: boolean;
	value: number;
};

@Component({
	selector: 'brightness-panel',
	templateUrl: './brightness-panel.html',
	styleUrl: './brightness-panel.scss',
	imports: [Card, SwitchComponent, SliderComponent],
})
export class BrightnessPanelComponent {
	value = model<BrightnessChange>({
		activated: true,
		value: MAX_BRIGHTNESS_VALUE,
	});

	onValueChange(value: number): void {
		const current = this.value();
		this.value.set({ ...current, value });
	}

	onStateChange(activated: boolean): void {
		const current = this.value();
		this.value.set({ ...current, activated });
	}
}
