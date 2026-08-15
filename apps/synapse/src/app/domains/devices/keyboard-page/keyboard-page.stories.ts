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
import { KeyboardPageComponent } from './keyboard-page';

const mock = {
	devices: [
		{
			kind: 'keyboard',
			name: 'Razer Huntsman Elite',
			vendor_id: 5426,
			product_id: 550,
		},
	],
	modules: [],
} satisfies Mock;

const meta: Meta<KeyboardPageComponent> = {
	component: KeyboardPageComponent,
	title: 'Synapse Application / Pages / Keyboard',
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
					useValue: { url: '/device/keyboard/5426-0550', events: EMPTY },
				},
			],
		}),
	],
};
export default meta;

type Story = StoryObj<KeyboardPageComponent>;

export const Default: Story = {
	name: 'Keyboard',
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getAllByRole('tab')).toHaveLength(2);
		await expect(
			canvas.getByRole('img', { name: 'Razer Huntsman Elite' }),
		).toBeVisible();
	},
};
