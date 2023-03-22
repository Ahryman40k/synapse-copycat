module.exports = {
  core: {
    
  },
  stories: ['../src/app/**/*.mdx', '../src/app/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-mdx-gfm'],
  // presets: ['@storybook/preset-typescript'],
  framework: {
    name: '@storybook/angular',
    options: {
    }
  },
  docs: {
    autodocs: true
  },
  staticDirs: ['../src']
};

// To customize your webpack configuration you can use the webpackFinal field.
// Check https://storybook.js.org/docs/react/builders/webpack#extending-storybooks-webpack-config
// and https://nx.dev/packages/storybook/documents/custom-builder-configs