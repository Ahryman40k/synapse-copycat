import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { StorybookConfig } from "@storybook/angular";

const require = createRequire(import.meta.url);

const config: StorybookConfig = {
	stories: [
		"../src/app/**/*.@(mdx|stories.@(js|jsx|ts|tsx))",
		"../../../libs/ui/src/lib/**/*.@(mdx|stories.@(js|jsx|ts|tsx))",
	],
	addons: [],
	framework: {
		name: getAbsolutePath("@storybook/angular"),
		options: {
			builder: {
				viteConfigPath: "vite.config.mts",
			},
		},
	},
};

export default config;

// To customize your Vite configuration you can use the viteFinal field.
// Check https://storybook.js.org/docs/react/builders/vite#configuration
// and https://nx.dev/recipes/storybook/custom-builder-configs

function getAbsolutePath(value: string): any {
	return dirname(require.resolve(join(value, "package.json")));
}
