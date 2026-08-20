import type { Device } from '@synapse-copycat/backend-api';
import {
	applicationConfig,
	type Meta,
	type StoryObj,
} from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { MEDIA_DEVICES } from '../../media/media-devices';
import { CameraPanel } from './camera-panel';

/**
 * A built-in webcam and a Kiyo, so the match has something to choose between
 * without one being attached. Storybook runs in a browser, so replacing this
 * with the real `navigator.mediaDevices` shows a real picture.
 */
const media = {
	enumerateDevices: async () =>
		[
			{ kind: 'videoinput', deviceId: 'built-in', label: 'Integrated Webcam' },
			{ kind: 'videoinput', deviceId: 'kiyo', label: 'Razer Kiyo (1532:0e03)' },
		] as MediaDeviceInfo[],
	getUserMedia: async () => ({ getTracks: () => [] }) as unknown as MediaStream,
} as Partial<MediaDevices>;

const KIYO: Device = {
	__type: 'device',
	kind: 'streaming',
	id: '5426-3587',
	name: 'Razer Kiyo',
	visual: 'assets/devices/5426-3587.png',
};

const meta: Meta<CameraPanel> = {
	// No .mdx beside this one, so Storybook generates the docs page.
	tags: ['autodocs'],
	component: CameraPanel,
	title: 'Synapse application / Components / camera panel',
	args: { device: KIYO },
	decorators: [
		applicationConfig({
			providers: [{ provide: MEDIA_DEVICES, useValue: media }],
		}),
	],
};

export default meta;
type Story = StoryObj<CameraPanel>;

/**
 * The stage keeps its box whether the preview is on or off — a frame that came
 * and went would make the panel jump on every toggle.
 */
export const Default: Story = {
	name: 'Camera panel',
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('switch', { name: 'Preview' }),
		).not.toBeChecked();
		await expect(canvas.getByText('Preview disabled')).toBeVisible();
		// Nothing to pick: the page is already about one camera, and the panel
		// opens the one its device names.
		await expect(canvas.queryByRole('combobox')).not.toBeInTheDocument();
	},
};

export const PreviewOn: Story = {
	name: 'Preview on',
	args: { value: { preview: true, autoFocus: true } },
};
