import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { StorybookConfig } from '@storybook/angular';

const require = createRequire(import.meta.url);

const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.ts'
  ],
  addons: [getAbsolutePath("@storybook/addon-docs")],
  framework: {
    name: getAbsolutePath("@storybook/angular"),
    options: {},
  },
  docs: {
    // autodocs: true,
    // defaultName: 'Docs'
  },
  staticDirs: [
    '../'
  ]
};

export default config;

// To customize your webpack configuration you can use the webpackFinal field.
// Check https://storybook.js.org/docs/react/builders/webpack#extending-storybooks-webpack-config
// and https://nx.dev/recipes/storybook/custom-builder-conttps://github.com/storybookjs/presets/tree/master/packages/preset-typescripts

function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, "package.json")));
}
