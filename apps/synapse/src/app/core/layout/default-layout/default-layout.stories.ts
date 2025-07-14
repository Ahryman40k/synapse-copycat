import type { Meta, StoryObj } from "@storybook/angular";

import { DefaultLayout } from "./default-layout";

const meta: Meta<DefaultLayout> = {
	component: DefaultLayout,
	title: "Synapse Application / Layout / default layout",
};
export default meta;

type Story = StoryObj<DefaultLayout>;

export const Default: Story = {};
