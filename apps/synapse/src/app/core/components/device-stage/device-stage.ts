import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	signal,
} from '@angular/core';

/**
 * The device portrait that heads a device page: the picture on a dot grid that
 * fades out from the centre into the page background.
 *
 * A component rather than markup in the page, because every device page wants
 * the same block and the backdrop is not trivial to repeat.
 */
@Component({
	selector: 'device-stage',
	templateUrl: './device-stage.html',
	styleUrl: './device-stage.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceStage {
	/** `Device.visual` — `assets/devices/<vendor>-<product>.png`. */
	readonly image = input<string | undefined>(undefined);

	/** The device name, which is what the picture is a picture of. */
	readonly name = input('');

	/**
	 * `visual` is derived from the vendor and product ids, so it names a file
	 * for every device — including the ones no artwork has been drawn for yet.
	 * Dropping the image on error leaves the backdrop alone rather than the
	 * browser's broken-image glyph, which reads as a bug in the page.
	 */
	protected readonly failed = signal(false);

	protected readonly showImage = computed(
		() => !!this.image() && !this.failed(),
	);
}
