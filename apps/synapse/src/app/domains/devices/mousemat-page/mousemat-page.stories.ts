import {
	applicationConfig,
	type Meta,
	type StoryObj,
} from '@storybook/angular';
import { MousematPageComponent } from './mousemat-page';
import {
	Mock,
	provideBackendApi,
	withMock,
} from '@synapse-copycat/backend-api';

const mock = {
	devices: [
		{
			product_id: 1,
			vendor_id: 2,
			kind: 'mouse',
			name: 'Test mouse',
		},
		{
			product_id: 5432,
			vendor_id: 1236,
			kind: 'keyboard',
			name: 'Test keyboard',
		},
	],
	modules: [],
} satisfies Mock;

const meta: Meta<MousematPageComponent> = {
	component: MousematPageComponent,
	title: 'Synapse Application / Pages / Mousemat',
	decorators: [
		applicationConfig({
			providers: [provideBackendApi(withMock(mock))],
		}),
	],
};
export default meta;

type Story = StoryObj<MousematPageComponent>;

export const Default: Story = {};
