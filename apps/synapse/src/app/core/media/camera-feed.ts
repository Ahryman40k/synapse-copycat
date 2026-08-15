import { inject, Injectable, signal } from '@angular/core';
import type { Device } from '@synapse-copycat/backend-api';
import {
	type InferOutput,
	minLength,
	object,
	pipe,
	safeParse,
	string,
} from 'valibot';
import { MEDIA_DEVICES } from './media-devices';

/**
 * A camera the browser is willing to open.
 *
 * `label` is empty until the user has granted permission at least once — a
 * privacy rule, not an error — which is why the panel numbers the cameras
 * itself when it has nothing to show.
 */
export const CameraDevice = object({
	deviceId: pipe(string(), minLength(1)),
	label: string(),
});
export type CameraDevice = InferOutput<typeof CameraDevice>;

/** `5426-3587` -> `1532:0e03`, the form a camera label carries it in. */
function usbId(device: Device): string | undefined {
	const [vendor, product] = device.id.split('-').map(Number);
	if (Number.isNaN(vendor) || Number.isNaN(product)) return undefined;

	const hex = (value: number) => value.toString(16).padStart(4, '0');
	return `${hex(vendor)}:${hex(product)}`;
}

/**
 * Which camera is the device whose page we are on.
 *
 * There is no need to ask: the user opened this page by clicking one
 * peripheral. The browser will not say which USB device a camera is, so the
 * only handle is its label — Chromium puts the ids in it (`Razer Kiyo
 * (1532:0e03)`), Firefox only the name, so both are tried in that order.
 *
 * ⚠️ Labels are empty until permission has been granted at least once, so this
 * finds nothing on a first run. `startFor` is what deals with that.
 */
export function matchCamera(
	cameras: readonly CameraDevice[],
	device: Device | undefined,
): string | undefined {
	if (!device) return undefined;

	const labelled = cameras.map((camera) => ({
		...camera,
		label: camera.label.toLowerCase(),
	}));

	const ids = usbId(device);
	const byIds = ids
		? labelled.find((camera) => camera.label.includes(ids))
		: undefined;

	return (
		byIds?.deviceId ??
		labelled.find((camera) => camera.label.includes(device.name.toLowerCase()))
			?.deviceId
	);
}

/** Releasing the device is stopping its tracks — dropping the stream is not. */
function stopTracks(stream: MediaStream): void {
	for (const track of stream.getTracks()) track.stop();
}

/** What went wrong, in words the panel can show. */
function describe(cause: unknown): string {
	const name = cause instanceof Error ? cause.name : '';

	if (name === 'NotAllowedError') return 'Permission refused';
	if (name === 'NotFoundError') return 'No camera found';
	if (name === 'NotReadableError') return 'The camera is already in use';
	return 'The camera could not be opened';
}

/**
 * Opens a camera and keeps the stream.
 *
 * The stream is stopped rather than dropped: letting go of a `MediaStream`
 * leaves its tracks live, which keeps the recording light on — the one bug in
 * this area a user notices immediately, and reads as the application spying on
 * them.
 */
@Injectable({ providedIn: 'root' })
export class CameraFeed {
	readonly #media = inject(MEDIA_DEVICES);

	/** Whether this build can show a picture at all. */
	readonly supported = !!this.#media;

	readonly cameras = signal<readonly CameraDevice[]>([]);

	/** What `start` was last asked for, which is not what it necessarily got. */
	#openedWith: string | undefined;

	/**
	 * Bumped by every `start` and every `stop`.
	 *
	 * `getUserMedia` takes as long as it takes — a permission prompt, a camera
	 * waking up — and the preview can be switched off in the meantime. Without
	 * this the stream then lands in `stream()` after the stop that was meant to
	 * release it, and the recording light stays on with nothing on screen to
	 * explain why. A stream that arrives out of turn is stopped on the spot.
	 */
	#generation = 0;
	readonly stream = signal<MediaStream | undefined>(undefined);
	readonly error = signal<string | undefined>(undefined);

	/**
	 * The video inputs the browser reports.
	 *
	 * Validated like anything else crossing into the application: an entry with
	 * no `deviceId` cannot be opened, so it is dropped rather than offered.
	 */
	async list(): Promise<void> {
		if (!this.#media) return;

		try {
			const devices = await this.#media.enumerateDevices();
			const cameras = devices
				.filter((device) => device.kind === 'videoinput')
				.map((device) =>
					safeParse(CameraDevice, {
						deviceId: device.deviceId,
						label: device.label,
					}),
				)
				.filter((result) => result.success)
				.map((result) => result.output);

			this.cameras.set(cameras);
		} catch {
			// Enumerating is best-effort: without it the default camera still opens.
			this.cameras.set([]);
		}
	}

	/**
	 * Open the camera belonging to a device, rather than whichever one the
	 * browser hands over first.
	 *
	 * It takes two passes on a first run, and cannot not: the labels this
	 * matches on are blank until a stream has been granted once. So the default
	 * camera is opened, the list is read again, and if the device names one we
	 * now recognise the stream moves to it. On every later run the first pass
	 * already matches.
	 */
	async startFor(device: Device | undefined): Promise<void> {
		const wanted = matchCamera(this.cameras(), device);
		await this.start(wanted);

		if (wanted || !this.stream()) return;

		const matched = matchCamera(this.cameras(), device);
		if (matched && matched !== this.#openedWith) await this.start(matched);
	}

	async start(deviceId?: string): Promise<void> {
		if (!this.#media) {
			this.error.set('No camera available here');
			return;
		}

		this.stop();
		this.#openedWith = deviceId;
		const generation = this.#generation;

		try {
			const stream = await this.#media.getUserMedia({
				video: deviceId ? { deviceId: { exact: deviceId } } : true,
			});

			// Switched off, or superseded by another start, while this one was
			// being granted. Nobody is going to stop it but us.
			if (generation !== this.#generation) {
				stopTracks(stream);
				return;
			}

			this.stream.set(stream);
			this.error.set(undefined);

			// Only now do the labels have names in them, so the list is worth
			// reading again.
			await this.list();
		} catch (cause) {
			if (generation !== this.#generation) return;
			this.error.set(describe(cause));
		}
	}

	stop(): void {
		// Before the tracks, so anything still in flight knows it is stale by
		// the time it resolves.
		this.#generation++;

		const stream = this.stream();
		if (stream) stopTracks(stream);
		this.stream.set(undefined);
	}
}
