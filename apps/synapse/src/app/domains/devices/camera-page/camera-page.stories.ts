import { inject, provideAppInitializer } from '@angular/core';
import {
	type Mock,
	provideBackendApi,
	unusedCommands,
	withMock,
} from '@synapse-copycat/backend-api';
import {
	applicationConfig,
	type Meta,
	type StoryObj,
} from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { ApplicationStore } from '../../../core/stores/application-store';
import { CameraPageComponent } from './camera-page';

const mock = {
	...unusedCommands(),
	devices: [
		{
			serial: 'XX0000000E03',
			kind: 'streaming',
			name: 'Razer Kiyo',
			vendor_id: 5426,
			product_id: 3587,
		},
	],
	modules: [],
} satisfies Mock;

const meta: Meta<CameraPageComponent> = {
	// No .mdx beside this one, so Storybook generates the docs page.
	tags: ['autodocs'],
	component: CameraPageComponent,
	title: 'Synapse Application / Pages / Camera',
	decorators: [
		applicationConfig({
			providers: [
				provideBackendApi(withMock(mock)),
				provideAppInitializer(() => {
					void inject(ApplicationStore).getDevices();
				}),
			],
		}),
	],
	// The `:id` segment, as `withComponentInputBinding()` supplies it at runtime.
	args: { id: 'XX0000000E03' },
};
export default meta;

type Story = StoryObj<CameraPageComponent>;

export const Default: Story = {
	name: 'Camera',
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getAllByRole('tab')).toHaveLength(1);
		await expect(canvas.getByRole('img', { name: 'Razer Kiyo' })).toBeVisible();
	},
};
