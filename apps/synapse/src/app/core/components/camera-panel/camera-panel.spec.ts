import type { Device } from '@synapse-copycat/backend-api';
import { render, screen } from '@testing-library/angular';
import { MEDIA_DEVICES } from '../../media/media-devices';
import { CameraPanel } from './camera-panel';

const KIYO: Device = {
	__type: 'device',
	kind: 'streaming',
	id: '5426-3587',
	name: 'Razer Kiyo',
	visual: 'assets/devices/5426-3587.png',
};

const camera = (deviceId: string, label = '') =>
	({ kind: 'videoinput', deviceId, label }) as MediaDeviceInfo;

const stop = vi.fn();
const streamOf = () =>
	({ getTracks: () => [{ stop }] }) as unknown as MediaStream;

const setup = async (
	options: {
		inputs?: Record<string, unknown>;
		cameras?: MediaDeviceInfo[];
		getUserMedia?: MediaDevices['getUserMedia'];
	} = {},
) => {
	const media = {
		enumerateDevices: async () => options.cameras ?? [camera('front', 'Kiyo')],
		getUserMedia: options.getUserMedia ?? (async () => streamOf()),
	} as Partial<MediaDevices>;

	const result = await render(CameraPanel, {
		inputs: options.inputs ?? {},
		providers: [{ provide: MEDIA_DEVICES, useValue: media }],
	});

	await result.fixture.whenStable();
	return result;
};

const preview = () => screen.getByRole('switch', { name: 'Preview' });

describe('CameraPanel', () => {
	beforeEach(() => stop.mockClear());

	it('is titled, preview off and focusing on its own', async () => {
		await setup();

		expect(screen.getByRole('heading', { name: 'Camera' })).toBeVisible();
		expect(preview()).not.toBeChecked();
		expect(screen.getByRole('switch', { name: 'Auto focus' })).toBeChecked();
	});

	it('says the stage is showing nothing while the preview is off', async () => {
		const { container } = await setup();

		expect(screen.getByText('Preview disabled')).toBeVisible();
		// The icon is decoration: the caption is what carries the meaning.
		const icon = container.querySelector('.camera-panel__notice-icon');
		expect(icon).toHaveAttribute('aria-hidden', 'true');
	});

	it('asks nothing about which camera to open', async () => {
		await setup({
			cameras: [camera('front', 'Kiyo'), camera('back', 'Integrated')],
		});

		// The user reached this page by clicking one peripheral; picking again
		// would be asking them something they have already said.
		expect(screen.queryByRole('combobox')).toBeNull();
	});

	it('opens the camera of the device it was given', async () => {
		const getUserMedia = vi.fn(async () => streamOf());
		const { fixture } = await setup({
			inputs: { device: KIYO },
			cameras: [
				camera('built-in', 'Integrated Webcam'),
				camera('kiyo', 'Razer Kiyo (1532:0e03)'),
			],
			getUserMedia,
		});

		preview().click();
		fixture.detectChanges();
		await fixture.whenStable();

		expect(getUserMedia).toHaveBeenCalledWith({
			video: { deviceId: { exact: 'kiyo' } },
		});
	});

	it('opens the camera when the preview is switched on', async () => {
		const getUserMedia = vi.fn(async () => streamOf());
		const { fixture } = await setup({ getUserMedia });

		preview().click();
		fixture.detectChanges();
		await fixture.whenStable();

		expect(getUserMedia).toHaveBeenCalled();
		expect(fixture.componentInstance.value().preview).toBe(true);
	});

	it('opens the camera once, not on every change detection', async () => {
		const getUserMedia = vi.fn(async () => streamOf());
		const { fixture } = await setup({
			inputs: { value: { preview: true, autoFocus: true } },
			getUserMedia,
		});

		fixture.detectChanges();
		await fixture.whenStable();
		fixture.detectChanges();
		await fixture.whenStable();

		// `startFor` reads the camera list before its first await, and also
		// fills it. Tracked, that made every open schedule another one: the
		// camera was closed and reopened without end and the picture never
		// arrived.
		expect(getUserMedia).toHaveBeenCalledTimes(1);
	});

	it('releases the camera when the preview is switched off', async () => {
		const { fixture } = await setup({
			inputs: { value: { preview: true, autoFocus: true } },
		});

		preview().click();
		fixture.detectChanges();
		await fixture.whenStable();

		// Stopping the tracks is what turns the recording light off.
		expect(stop).toHaveBeenCalled();
	});

	it('releases the camera even when it is granted after the switch off', async () => {
		let grant!: (stream: MediaStream) => void;
		const { fixture } = await setup({
			inputs: { value: { preview: true, autoFocus: true } },
			getUserMedia: () =>
				new Promise<MediaStream>((resolve) => {
					grant = resolve;
				}),
		});

		// Switched off while the camera was still being granted — the real
		// timing, which an immediate fake hides.
		preview().click();
		fixture.detectChanges();
		await fixture.whenStable();

		grant(streamOf());
		await fixture.whenStable();

		expect(stop).toHaveBeenCalled();
	});

	it('starts playing the stream rather than leaving a black frame', async () => {
		// `autoplay` is evaluated when the element loads, and the stream is
		// attached long afterwards; without an explicit play the picture never
		// appears.
		const play = vi
			.spyOn(HTMLMediaElement.prototype, 'play')
			.mockResolvedValue(undefined);

		const { fixture, container } = await setup({
			inputs: { value: { preview: true, autoFocus: true } },
		});
		// The stream arrives a microtask after the first render, so the effect
		// that attaches it needs another pass.
		fixture.detectChanges();
		await fixture.whenStable();

		const video = container.querySelector('video') as HTMLVideoElement;
		// `srcObject` is not asserted: jsdom exposes the accessor but stores
		// nothing, so it reads back null however it was set.
		expect(play).toHaveBeenCalled();
		// Unattended playback is only allowed on a muted element.
		expect(video.muted).toBe(true);

		play.mockRestore();
	});

	it('shows what went wrong instead of an empty frame', async () => {
		const { fixture } = await setup({
			inputs: { value: { preview: true, autoFocus: true } },
			getUserMedia: async () => {
				throw Object.assign(new Error('no'), { name: 'NotAllowedError' });
			},
		});
		await fixture.whenStable();

		expect(screen.getByRole('status')).toHaveTextContent('Permission refused');
	});

	it('reports each switch through the model, leaving the other alone', async () => {
		const { fixture } = await setup();

		preview().click();
		fixture.detectChanges();

		expect(fixture.componentInstance.value()).toEqual({
			preview: true,
			autoFocus: true,
		});
	});

	it('reflects a state set from outside', async () => {
		await setup({ inputs: { value: { preview: true, autoFocus: false } } });

		expect(preview()).toBeChecked();
		expect(
			screen.getByRole('switch', { name: 'Auto focus' }),
		).not.toBeChecked();
	});
});
