import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	effect,
	ElementRef,
	inject,
	input,
	model,
	untracked,
	viewChild,
} from '@angular/core';
import type { Device } from '@synapse-copycat/backend-api';
import { Panel, SwitchComponent } from '@synapse-copycat/ui';
import { CameraFeed } from '../../media/camera-feed';

export type CameraSettings = {
	preview: boolean;
	autoFocus: boolean;
};

export const CAMERA_DEFAULT: CameraSettings = {
	preview: false,
	autoFocus: true,
};

/**
 * The camera itself: which one, whether it is showing, and whether it focuses
 * on its own.
 *
 * The preview is a real feed — `getUserMedia` through `CameraFeed`. Two things
 * matter about it. The stream is stopped, not dropped, whenever the preview
 * goes off or the panel is destroyed, because live tracks keep the recording
 * light on. And it opens the camera belonging to `device` rather than whichever
 * one the browser hands over: the user reached this page by clicking one
 * peripheral, so there is nothing to ask them.
 */
@Component({
	selector: 'camera-panel',
	templateUrl: './camera-panel.html',
	styleUrl: './camera-panel.scss',
	imports: [Panel, SwitchComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CameraPanel {
	readonly #feed = inject(CameraFeed);

	readonly value = model<CameraSettings>(CAMERA_DEFAULT);

	/** The peripheral this page is about — the camera to open. */
	readonly device = input<Device | undefined>(undefined);

	protected readonly preview = computed(() => this.value().preview);
	protected readonly autoFocus = computed(() => this.value().autoFocus);

	protected readonly error = this.#feed.error;
	protected readonly supported = this.#feed.supported;

	// TS-private, not `#video`: the Angular compiler rejects `viewChild` on an
	// ES private field. Same reason the slider declares its own that way.
	private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');

	constructor() {
		// Ids are readable before permission, names are not; the list is read
		// again once a stream has been granted.
		void this.#feed.list();

		effect(() => {
			// Both are read every run so the stream follows either changing —
			// walking from one camera's page to another has to switch it.
			const on = this.preview();
			const device = this.device();

			// `untracked` is what stops this from looping. `startFor` reads the
			// camera list before its first await, so without it the effect
			// depended on that list — and `startFor` fills it. Every open
			// scheduled another one: the camera was closed and reopened without
			// end, which shows as a picture that never arrives.
			untracked(() => {
				if (on) void this.#feed.startFor(device);
				else this.#feed.stop();
			});
		});

		effect(() => {
			// Read before the early return, so this effect depends on the stream
			// even on a run where the element is not in the view yet.
			const stream = this.#feed.stream() ?? null;

			const element = this.video()?.nativeElement;
			if (!element) return;

			// A property, not an attribute: a MediaStream cannot be serialised
			// into `src`.
			element.srcObject = stream;
			if (!stream) return;

			// `autoplay` alone leaves the picture black: it is evaluated when the
			// element loads, and this stream is attached long afterwards. Playing
			// it explicitly is what starts it — and unattended playback is only
			// allowed on a muted element, which is why the property is set here
			// rather than trusted to the attribute.
			element.muted = true;

			// `play()` only returns a promise where it is implemented — jsdom and
			// older browsers return nothing at all, so it is optional here.
			element.play()?.catch((cause: unknown) => {
				// Replacing a stream aborts the pending play; that one is noise.
				if (cause instanceof Error && cause.name === 'AbortError') return;
				console.warn('[synapse] the camera preview would not start', cause);
			});
		});

		// Leaving the page must release the camera, not merely stop showing it.
		inject(DestroyRef).onDestroy(() => this.#feed.stop());
	}

	protected onPreviewChange(preview: boolean): void {
		this.value.set({ ...this.value(), preview });
	}

	protected onAutoFocusChange(autoFocus: boolean): void {
		this.value.set({ ...this.value(), autoFocus });
	}
}
