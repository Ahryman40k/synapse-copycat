import type { Meta, StoryObj } from '@storybook/angular';
import { SwitchComponent } from './switch';

const meta: Meta<SwitchComponent> = {
	component: SwitchComponent,
	title: 'UI library / Switch',
};

export default meta;
type Story = StoryObj<SwitchComponent>;

export const Default: Story = {
	args: {},
	// render: () => ({
	//   template: `<syn-switch></syn-switch>`,
	// }),
};
