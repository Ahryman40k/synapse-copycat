import type { StorybookConfig } from '@storybook/angular';

import { Title } from '@storybook/blocks';

const config: StorybookConfig = {
  stories: ['../src/app/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-styling-webpack',
    '@storybook/addon-actions',
    '@storybook/addon-a11y',
    '@storybook/addon-coverage',
  ],
  framework: {
    name: '@storybook/angular',
    options: {},
  },
  // staticDirs: ['../assets'],
  docs: {
    autodocs: 'tag',
    defaultName: 'docs',
  },
  features: {
    // storyStoreV7: false,
  },
  core: {
    disableTelemetry: true,
  },
  staticDirs: ['../src'],
};

export default config;

// To customize your webpack configuration you can use the webpackFinal field.
// Check https://storybook.js.org/docs/react/builders/webpack#extending-storybooks-webpack-config
// and https://nx.dev/recipes/storybook/custom-builder-configs