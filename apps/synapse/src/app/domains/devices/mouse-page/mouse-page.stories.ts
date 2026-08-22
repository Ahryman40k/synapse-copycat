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
import { MousePageComponent } from './mouse-page';

const mock = {
	...unusedCommands(),
	devices: [
		{
			serial: 'XX0000000088',
			kind: 'mouse',
			name: 'Razer Basilisk Ultimate',
			vendor_id: 5426,
			product_id: 136,
		},
	],
	modules: [],
} satisfies Mock;

const meta: Meta<MousePageComponent> = {
	// No .mdx beside this one, so Storybook generates the docs page.
	tags: ['autodocs'],
	component: MousePageComponent,
	title: 'Synapse Application / Pages / Mouse',
	decorators: [
		applicationConfig({
			providers: [
				provideBackendApi(withMock(mock)),
				// The page reads the devices from the store, which the dashboard
				// route fills in the running application.
				provideAppInitializer(() => {
					void inject(ApplicationStore).getDevices();
				}),
			],
		}),
	],
	// The `:id` segment, as `withComponentInputBinding()` supplies it at runtime.
	args: { id: 'XX0000000088' },
};
export default meta;

type Story = StoryObj<MousePageComponent>;

export const Default: Story = {
	name: 'Mouse',
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getAllByRole('tab')).toHaveLength(4);
	},
};
