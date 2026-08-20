import { inject, provideAppInitializer } from '@angular/core';
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
import { ApplicationStore } from '../../../core/stores/application-store';
import { MousematPageComponent } from './mousemat-page';

const mock = {
	devices: [
		{
			kind: 'mousemat',
			name: 'Goliatus Extended',
			vendor_id: 5426,
			product_id: 3074,
		},
		{
			kind: 'mouse',
			name: 'Razer Basilisk Ultimate',
			vendor_id: 5426,
			product_id: 136,
		},
	],
	modules: [],
} satisfies Mock;

const meta: Meta<MousematPageComponent> = {
	// No .mdx beside this one, so Storybook generates the docs page.
	tags: ['autodocs'],
	component: MousematPageComponent,
	title: 'Synapse Application / Pages / Mousemat',
	decorators: [
		applicationConfig({
			providers: [
				provideBackendApi(withMock(mock)),
				// The page reads the devices from the store, which the dashboard
				// route fills in the running application. There is no router here,
				// so the story has to fill it itself or the page has no device.
				provideAppInitializer(() => {
					void inject(ApplicationStore).getDevices();
				}),
			],
		}),
	],
	// The `:id` segment, as `withComponentInputBinding()` supplies it at runtime.
	args: { id: '5426-3074' },
};
export default meta;

type Story = StoryObj<MousematPageComponent>;

export const Default: Story = {};
