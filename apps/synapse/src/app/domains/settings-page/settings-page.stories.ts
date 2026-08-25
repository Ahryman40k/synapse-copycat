import {
	applicationConfig,
	type Meta,
	type StoryObj,
} from '@storybook/angular';
import {
	provideBackendApi,
	unusedCommands,
	withMock,
} from '@synapse-copycat/backend-api';
import { expect, within } from 'storybook/test';
import { SettingsPage } from './settings-page';

const meta: Meta<SettingsPage> = {
	// No .mdx beside this one, so Storybook generates the docs page.
	tags: ['autodocs'],
	component: SettingsPage,
	title: 'Synapse Application / Pages / Settings',
	decorators: [
		applicationConfig({
			providers: [
				provideBackendApi(
					withMock({
						...unusedCommands(),
						devices: [],
					}),
				),
			],
		}),
	],
};
export default meta;

type Story = StoryObj<SettingsPage>;

/** No tab bar: one page, nothing to choose between. */
export const Default: Story = {
	name: 'Settings',
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.queryByRole('tablist')).not.toBeInTheDocument();
		await expect(
			canvas.getByRole('combobox', { name: 'Interface language' }),
		).toHaveValue('en');
		await expect(
			canvas.getByRole('link', { name: /synapse-copycat/ }),
		).toBeVisible();
	},
};
