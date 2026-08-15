import { TestBed } from '@angular/core/testing';
import type { Device } from '@synapse-copycat/backend-api';
import { CameraFeed, matchCamera } from './camera-feed';
import { MEDIA_DEVICES } from './media-devices';

const camera = (deviceId: string, label = '') =>
	({ kind: 'videoinput', deviceId, label }) as MediaDeviceInfo;

const setup = (media: Partial<MediaDevices> | undefined) => {
	TestBed.configureTestingModule({
		providers: [{ provide: MEDIA_DEVICES, useValue: media }],
	});
	return TestBed.inject(CameraFeed);
};

const streamOf = (...tracks: { stop: () => void }[]) =>
	({ getTracks: () => tracks }) as unknown as MediaStream;

const KIYO: Device = {
	__type: 'device',
	kind: 'streaming',
	id: '5426-3587',
	name: 'Razer Kiyo',
	visual: 'assets/devices/5426-3587.png',
};

describe('matchCamera', () => {
	it('recognises the device by the ids in the label', () => {
		const found = matchCamera(
			[
				{ deviceId: 'built-in', label: 'Integrated Webcam (0bda:5411)' },
				{ deviceId: 'kiyo', label: 'Razer Kiyo (1532:0e03)' },
			],
			KIYO,
		);

		// 5426-3587 decimal is 1532:0e03 hex, which is what a label carries.
		expect(found).toBe('kiyo');
	});

	it('falls back to the name where the label has no ids', () => {
		// Firefox reports the name alone.
		const found = matchCamera(
			[
				{ deviceId: 'built-in', label: 'Integrated Webcam' },
				{ deviceId: 'kiyo', label: 'Razer Kiyo' },
			],
			KIYO,
		);

		expect(found).toBe('kiyo');
	});

	it('prefers the ids over the name', () => {
		const found = matchCamera(
			[
				{ deviceId: 'other', label: 'Razer Kiyo clone' },
				{ deviceId: 'kiyo', label: 'Some name (1532:0e03)' },
			],
			KIYO,
		);

		expect(found).toBe('kiyo');
	});

	it('finds nothing before the labels are readable', () => {
		// Empty until permission has been granted at least once.
		expect(
			matchCamera([{ deviceId: 'kiyo', label: '' }], KIYO),
		).toBeUndefined();
	});

	it('finds nothing for a device that is not a camera at all', () => {
		expect(
			matchCamera([{ deviceId: 'kiyo', label: 'Razer Kiyo' }], undefined),
		).toBeUndefined();
	});
});

describe('CameraFeed', () => {
	it('lists the video inputs and nothing else', async () => {
		const feed = setup({
			enumerateDevices: async () => [
				camera('front', 'Kiyo'),
				{
					kind: 'audioinput',
					deviceId: 'mic',
					label: 'Mic',
				} as MediaDeviceInfo,
			],
		});

		await feed.list();

		expect(feed.cameras()).toEqual([{ deviceId: 'front', label: 'Kiyo' }]);
	});

	it('drops a camera it could not open', async () => {
		const feed = setup({
			// An empty deviceId is what a browser reports for a device it will not
			// hand over; offering it would be offering something unusable.
			enumerateDevices: async () => [camera(''), camera('front')],
		});

		await feed.list();

		expect(feed.cameras()).toHaveLength(1);
	});

	it('keeps a camera whose name is still empty', async () => {
		const feed = setup({ enumerateDevices: async () => [camera('front')] });

		await feed.list();

		// Names only arrive with permission; that is not a reason to hide it.
		expect(feed.cameras()).toEqual([{ deviceId: 'front', label: '' }]);
	});

	it('opens the camera and reads the names again', async () => {
		let granted = false;
		const feed = setup({
			enumerateDevices: async () => [camera('front', granted ? 'Kiyo' : '')],
			getUserMedia: async () => {
				granted = true;
				return streamOf({ stop: vi.fn() });
			},
		});

		await feed.list();
		expect(feed.cameras()[0].label).toBe('');

		await feed.start();

		expect(feed.stream()).toBeDefined();
		expect(feed.error()).toBeUndefined();
		expect(feed.cameras()[0].label).toBe('Kiyo');
	});

	it('asks for the camera it was given', async () => {
		let asked: MediaStreamConstraints | undefined;
		const feed = setup({
			enumerateDevices: async () => [],
			getUserMedia: async (constraints) => {
				asked = constraints;
				return streamOf({ stop: vi.fn() });
			},
		});

		await feed.start('front');

		expect(asked).toEqual({ video: { deviceId: { exact: 'front' } } });
	});

	it('stops every track rather than dropping the stream', async () => {
		const stop = vi.fn();
		const feed = setup({
			enumerateDevices: async () => [],
			getUserMedia: async () => streamOf({ stop }, { stop }),
		});

		await feed.start();
		feed.stop();

		// Letting go of a MediaStream leaves its tracks live, which keeps the
		// recording light on.
		expect(stop).toHaveBeenCalledTimes(2);
		expect(feed.stream()).toBeUndefined();
	});

	it('releases the previous camera before opening another', async () => {
		const stop = vi.fn();
		const feed = setup({
			enumerateDevices: async () => [],
			getUserMedia: async () => streamOf({ stop }),
		});

		await feed.start('front');
		await feed.start('back');

		expect(stop).toHaveBeenCalledTimes(1);
	});

	it('opens the device its page is about', async () => {
		let asked: MediaStreamConstraints | undefined;
		const feed = setup({
			enumerateDevices: async () => [
				camera('built-in', 'Integrated Webcam'),
				camera('kiyo', 'Razer Kiyo (1532:0e03)'),
			],
			getUserMedia: async (constraints) => {
				asked = constraints;
				return streamOf({ stop: vi.fn() });
			},
		});

		await feed.list();
		await feed.startFor(KIYO);

		expect(asked).toEqual({ video: { deviceId: { exact: 'kiyo' } } });
	});

	it('moves to the right camera once the names become readable', async () => {
		// The first run cannot match: labels are blank until a stream has been
		// granted, so the default camera opens and the list is read again.
		let granted = false;
		const asked: (MediaStreamConstraints | undefined)[] = [];
		const feed = setup({
			enumerateDevices: async () => [
				camera('built-in', granted ? 'Integrated Webcam' : ''),
				camera('kiyo', granted ? 'Razer Kiyo (1532:0e03)' : ''),
			],
			getUserMedia: async (constraints) => {
				asked.push(constraints);
				granted = true;
				return streamOf({ stop: vi.fn() });
			},
		});

		await feed.list();
		await feed.startFor(KIYO);

		expect(asked).toEqual([
			{ video: true },
			{ video: { deviceId: { exact: 'kiyo' } } },
		]);
	});

	it('stays on the default camera when none matches the device', async () => {
		const asked: (MediaStreamConstraints | undefined)[] = [];
		const feed = setup({
			enumerateDevices: async () => [camera('built-in', 'Integrated Webcam')],
			getUserMedia: async (constraints) => {
				asked.push(constraints);
				return streamOf({ stop: vi.fn() });
			},
		});

		await feed.startFor(KIYO);

		expect(asked).toEqual([{ video: true }]);
	});

	it('releases a camera that is granted after the stop', async () => {
		let grant!: (stream: MediaStream) => void;
		const stop = vi.fn();
		const feed = setup({
			enumerateDevices: async () => [],
			// Held open, the way a permission prompt or a waking camera holds it.
			getUserMedia: () =>
				new Promise<MediaStream>((resolve) => {
					grant = resolve;
				}),
		});

		const opening = feed.start();
		feed.stop();
		grant(streamOf({ stop }));
		await opening;

		// Nobody else is going to stop it: it was granted to a preview that no
		// longer exists, and the recording light would stay on for good.
		expect(stop).toHaveBeenCalledTimes(1);
		expect(feed.stream()).toBeUndefined();
	});

	it('keeps only the last camera when two are asked for at once', async () => {
		const grants: ((stream: MediaStream) => void)[] = [];
		const first = vi.fn();
		const second = vi.fn();
		const feed = setup({
			enumerateDevices: async () => [],
			getUserMedia: () =>
				new Promise<MediaStream>((resolve) => {
					grants.push(resolve);
				}),
		});

		const opening = feed.start('front');
		const reopening = feed.start('back');

		grants[0](streamOf({ stop: first }));
		grants[1](streamOf({ stop: second }));
		await Promise.all([opening, reopening]);

		expect(first).toHaveBeenCalledTimes(1);
		expect(feed.stream()).toBeDefined();
		expect(second).not.toHaveBeenCalled();
	});

	it('says so when another application already holds the camera', async () => {
		const busy = Object.assign(new Error('busy'), {
			name: 'NotReadableError',
		});
		const feed = setup({
			enumerateDevices: async () => [],
			getUserMedia: async () => {
				throw busy;
			},
		});

		await feed.start();

		// The common one: a call or a recorder has it, and nothing about an
		// empty frame would say why.
		expect(feed.error()).toBe('The camera is already in use');
	});

	it('says what went wrong in words', async () => {
		const refused = Object.assign(new Error('denied'), {
			name: 'NotAllowedError',
		});
		const feed = setup({
			enumerateDevices: async () => [],
			getUserMedia: async () => {
				throw refused;
			},
		});

		await feed.start();

		expect(feed.error()).toBe('Permission refused');
		expect(feed.stream()).toBeUndefined();
	});

	it('reports rather than throws where there is no camera API', async () => {
		const feed = setup(undefined);

		expect(feed.supported).toBe(false);

		await feed.list();
		await feed.start();

		expect(feed.cameras()).toEqual([]);
		expect(feed.error()).toBe('No camera available here');
	});
});
