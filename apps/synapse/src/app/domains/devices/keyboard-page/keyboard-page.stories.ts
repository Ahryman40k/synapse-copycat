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
import { KeyboardPageComponent } from './keyboard-page';

const mock = {
	...unusedCommands(),
	devices: [
		{
			serial: 'XX0000000226',
			kind: 'keyboard',
			name: 'Razer Huntsman Elite',
			vendor_id: 5426,
			product_id: 550,
		},
	],
} satisfies Mock;

const meta: Meta<KeyboardPageComponent> = {
	// No .mdx beside this one, so Storybook generates the docs page.
	tags: ['autodocs'],
	component: KeyboardPageComponent,
	title: 'Synapse Application / Pages / Keyboard',
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
	args: { id: 'XX0000000226' },
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
