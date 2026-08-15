import {
	ChangeDetectionStrategy,
	Component,
	computed,
	model,
} from '@angular/core';
import {
	Button,
	Panel,
	SliderComponent,
	SwitchComponent,
	TemperatureSlider,
} from '@synapse-copycat/ui';

export type ImagePreset = 'default' | 'cool' | 'vibrant' | 'warm' | 'custom';

export type ImageSettings = {
	preset: ImagePreset;
	/** 0-100, all three of them. */
	brightness: number;
	contrast: number;
	saturation: number;
	/** Kelvin, unlike the three above — 2000 (warm) to 7500 (cool). */
	whiteBalance: number;
	whiteBalanceAuto: boolean;
};

export const IMAGE_DEFAULT: ImageSettings = {
	preset: 'default',
	brightness: 50,
	contrast: 50,
	saturation: 50,
	whiteBalance: 5000,
	whiteBalanceAuto: true,
};

/** What each preset sets. `custom` is the absence of a preset, so it sets nothing. */
const PRESETS: Record<
	Exclude<ImagePreset, 'custom'>,
	Pick<ImageSettings, 'brightness' | 'contrast' | 'saturation' | 'whiteBalance'>
> = {
	// White balance is kelvin, so the numbers are temperatures: a cool picture
	// is a high one, a warm picture a low one.
	default: { brightness: 50, contrast: 50, saturation: 50, whiteBalance: 5000 },
	cool: { brightness: 50, contrast: 55, saturation: 45, whiteBalance: 6800 },
	vibrant: { brightness: 55, contrast: 65, saturation: 75, whiteBalance: 5200 },
	warm: { brightness: 50, contrast: 55, saturation: 60, whiteBalance: 3200 },
};

type Adjustment = {
	key: 'brightness' | 'contrast' | 'saturation';
	label: string;
};

@Component({
	selector: 'image-panel',
	templateUrl: './image-panel.html',
	styleUrl: './image-panel.scss',
	imports: [Panel, Button, SliderComponent, SwitchComponent, TemperatureSlider],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImagePanel {
	readonly value = model<ImageSettings>(IMAGE_DEFAULT);

	protected readonly presets: readonly ImagePreset[] = [
		'default',
		'cool',
		'vibrant',
		'warm',
		'custom',
	];

	protected readonly adjustments: readonly Adjustment[] = [
		{ key: 'brightness', label: 'Brightness' },
		{ key: 'contrast', label: 'Contrast' },
		{ key: 'saturation', label: 'Saturation' },
	];

	protected readonly preset = computed(() => this.value().preset);
	protected readonly whiteBalance = computed(() => this.value().whiteBalance);
	protected readonly whiteBalanceAuto = computed(
		() => this.value().whiteBalanceAuto,
	);

	protected level(key: Adjustment['key']): number {
		return this.value()[key];
	}

	protected selectPreset(preset: ImagePreset): void {
		if (preset === 'custom') {
			this.value.set({ ...this.value(), preset });
			return;
		}

		this.value.set({ ...this.value(), preset, ...PRESETS[preset] });
	}

	/**
	 * Moving a slider lands on `custom`: the picture no longer matches the
	 * preset that was chosen, and leaving it lit would claim otherwise. It is
	 * also the only thing that makes `custom` mean anything.
	 */
	protected onLevelChange(key: Adjustment['key'], level: number): void {
		this.value.set({ ...this.value(), [key]: level, preset: 'custom' });
	}

	protected onWhiteBalanceChange(whiteBalance: number): void {
		this.value.set({ ...this.value(), whiteBalance, preset: 'custom' });
	}

	protected onWhiteBalanceAutoChange(whiteBalanceAuto: boolean): void {
		this.value.set({ ...this.value(), whiteBalanceAuto });
	}
}
