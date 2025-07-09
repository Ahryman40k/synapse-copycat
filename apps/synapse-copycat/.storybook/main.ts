import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { StorybookConfig } from "@storybook/angular";

const require = createRequire(import.meta.url);

const config: StorybookConfig = {
	stories: [
		"../src/app/**/*.stories.@(js|jsx|ts|tsx|mdx)",
		"../../../libs/synapse-ui/src/lib/**/*.stories.@(js|jsx|ts|tsx|mdx)",
	],
	addons: [
        getAbsolutePath("@storybook/addon-a11y"),
        getAbsolutePath("@storybook/addon-coverage"),
        getAbsolutePath("@storybook/addon-docs")
    ],
	framework: {
		name: getAbsolutePath("@storybook/angular"),
		options: {},
	},
	docs: {
        defaultName: "docs"
    },
	features: {},
	core: {
		disableTelemetry: true,
	},
	staticDirs: ["../src"],
};

export default config;

// To customize your webpack configuration you can use the webpackFinal field.
// Check https://storybook.js.org/docs/react/builders/webpack#extending-storybooks-webpack-config
// and https://nx.dev/recipes/storybook/custom-builder-configs

function getAbsolutePath(value: string): any {
    return dirname(require.resolve(join(value, "package.json")));
}
