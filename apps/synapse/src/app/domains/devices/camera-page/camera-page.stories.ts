import { inject, provideAppInitializer } from '@angular/core';
import { Router } from '@angular/router';
import {
	type Mock,
	provideBackendApi,
	withMock,
} from '@synapse-copycat/backend-api';
import {
	applicationConfig,
	type Meta,
	type StoryObj,
} from '@storybook/angular';
import { EMPTY } from 'rxjs';
import { expect, within } from 'storybook/test';
import { ApplicationStore } from '../../../core/stores/application-store';
import { CameraPageComponent } from './camera-page';

const mock = {
	devices: [
		{
			kind: 'streaming',
			name: 'Razer Kiyo',
			vendor_id: 5426,
			product_id: 3587,
		},
	],
	modules: [],
} satisfies Mock;

const meta: Meta<CameraPageComponent> = {
	component: CameraPageComponent,
	title: 'Synapse Application / Pages / Camera',
	decorators: [
		applicationConfig({
			providers: [
				provideBackendApi(withMock(mock)),
				provideAppInitializer(() => {
					void inject(ApplicationStore).getDevices();
				}),
				// The store selects the device from the URL, and Storybook's own
				// address says nothing about devices. Standing in for the router
				// beats navigating the iframe away from the address Storybook needs.
				{
					provide: Router,
					useValue: { url: '/device/streaming/5426-3587', events: EMPTY },
				},
			],
		}),
	],
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
