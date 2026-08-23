import { inject, provideAppInitializer } from '@angular/core';
import {
	type Mock,
	mockTwinkly,
	provideBackendApi,
	unusedCommands,
	withMock,
} from '@synapse-copycat/backend-api';
import {
	applicationConfig,
	type Meta,
	type StoryObj,
} from '@storybook/angular';
import { ApplicationStore } from '../../../core/stores/application-store';
import { StripPage } from './strip-page';

const STRIP = 'twinkly-1c9dc285dd79';

const mock = {
	...unusedCommands(),
	// The strip on the bench, as the sweep reports it.
	twinkly_devices: [
		{
			participant: STRIP,
			name: 'Twinkly_85DD79',
			address: '192.168.1.201',
			product_code: 'TWS050STQ',
			leds: 50,
			profile: 'RGB',
		},
	],
	...mockTwinkly([STRIP]),
} satisfies Mock;

const meta: Meta<StripPage> = {
	// No .mdx beside this one, so Storybook generates the docs page.
	tags: ['autodocs'],
	component: StripPage,
	title: 'Synapse Application / Pages / Strip',
	decorators: [
		applicationConfig({
			providers: [
				provideBackendApi(withMock(mock)),
				// The page reads the device from the store, which the dashboard
				// route fills in the running application. There is no router here,
				// so the story has to fill it itself or the page has no device.
				provideAppInitializer(() => {
					void inject(ApplicationStore).getDiscovered();
				}),
			],
		}),
	],
	// The `:id` segment, as `withComponentInputBinding()` supplies it at runtime.
	args: { id: STRIP },
};
export default meta;

type Story = StoryObj<StripPage>;

export const Default: Story = {};
