import type { StorybookConfig } from '@storybook/angular';


const config: StorybookConfig = {
  stories: [
    '../src/app/**/*.@(mdx|stories.@(ts|tsx))',
    '../../../libs/ui/src/lib/**/*.@(mdx|stories.@(ts|tsx))',
  ],
  addons: ['@chromatic-com/storybook', '@storybook/addon-docs'],
  framework: {
    name: '@storybook/angular',
    options: {
      builder: {
        viteConfigPath: 'vite.config.mts',
      },
    },
  },
};

export default config;

// To customize your Vite configuration you can use the viteFinal field.
// Check https://storybook.js.org/docs/react/builders/vite#configuration
// and https://nx.dev/recipes/storybook/custom-builder-configs
