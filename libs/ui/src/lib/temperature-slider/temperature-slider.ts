import {
	booleanAttribute,
	ChangeDetectionStrategy,
	Component,
	input,
	model,
	numberAttribute,
} from '@angular/core';
import { SliderComponent } from '../slider/slider';

/**
 * A colour-temperature slider: the same control as `syn-slider`, with the
 * scale it belongs on.
 *
 * The track is a fixed blue-to-orange ramp rather than a fill that grows from
 * the left. Temperature is not a quantity you have more or less of — every
 * point on the scale is a colour, and the ramp shows which one before the
 * value is read. The thumb alone says where you are.
 *
 * Its own component rather than options on `syn-slider`: that one measures a
 * level, and a gradient track with named ends would be dead weight on every
 * other use of it.
 */
@Component({
	selector: 'syn-temperature-slider',
	templateUrl: './temperature-slider.html',
	imports: [SliderComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemperatureSlider {
	/** Kelvin. The default span is the one a webcam white balance offers. */
	readonly min = input(2000, { transform: numberAttribute });
	readonly max = input(7500, { transform: numberAttribute });

	/** 100 K: finer than the eye resolves, coarser than a per-kelvin drag. */
	readonly step = input(100, { transform: numberAttribute });

	readonly disabled = input(false, { transform: booleanAttribute });

	readonly ariaLabel = input<string | undefined>(undefined);

	/** Two-way. `valueChange` is the change output. */
	readonly value = model(5000);
}
