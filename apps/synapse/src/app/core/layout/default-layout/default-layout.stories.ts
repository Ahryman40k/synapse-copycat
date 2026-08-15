import { inject, provideAppInitializer } from '@angular/core';
import { provideRouter } from '@angular/router';
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
import { expect, within } from 'storybook/test';
import { ApplicationStore } from '../../stores/application-store';
import { DefaultLayout } from './default-layout';

const mock = {
	devices: [
		{
			kind: 'mouse',
			name: 'Razer Basilisk Ultimate',
			vendor_id: 5426,
			product_id: 136,
		},
		{
			kind: 'mousemat',
			name: 'Goliatus Extended',
			vendor_id: 5426,
			product_id: 3074,
		},
	],
	modules: [{ kind: 'twinkly', name: 'Twinkly' }],
} satisfies Mock;

/**
 * The application shell: the bar, and whatever the router puts under it.
 *
 * This story used to be the generated `export const Default = {}` with no
 * providers at all, so opening it only ever produced NG0201 — the layout reads
 * the store, the store needs a backend. It needs three things to stand up:
 * the mock backend, a router (the shell renders a `<router-outlet>` and derives
 * the current entry from the URL), and someone to fill the store, which the
 * dashboard route does in the running application.
 */
const meta: Meta<DefaultLayout> = {
	component: DefaultLayout,
	title: 'Synapse Application / Layout / default layout',
	decorators: [
		applicationConfig({
			providers: [
				provideBackendApi(withMock(mock)),
				provideRouter([]),
				provideAppInitializer(() => {
					void inject(ApplicationStore).getDevices();
					void inject(ApplicationStore).getModules();
				}),
			],
		}),
	],
};
export default meta;

type Story = StoryObj<DefaultLayout>;

export const Default: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		// The outlet is empty — there are no routes here — so the bar is the whole
		// of what the shell contributes. Entries are labelled by kind, with the
		// full device name carried by the title.
		await expect(canvas.getByRole('button', { name: 'Synapse' })).toBeVisible();
		await expect(
			canvas.getByRole('button', { name: 'mousemat' }),
		).toBeVisible();
		await expect(canvas.getByRole('button', { name: 'twinkly' })).toBeVisible();
	},
};
