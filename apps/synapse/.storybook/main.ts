import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import type { StorybookConfig } from '@storybook/angular';

const config: StorybookConfig = {
  stories: [
    '../src/app/**/*.@(mdx|stories.@(ts|tsx))',
    '../../../libs/ui/src/lib/**/*.@(mdx|stories.@(ts|tsx))',
  ],
  addons: [
    await getAbsolutePath('@chromatic-com/storybook'),
    await getAbsolutePath('@storybook/addon-docs'),
    await getAbsolutePath('@storybook/addon-coverage'),
  ],
  framework: {
    name: await getAbsolutePath('@storybook/angular'),
    options: {
      builder: {
        viteConfigPath: 'vite.config.mts',
      },
    },
  },
  staticDirs: ['..', '../src'],
};

export default config;

// To customize your Vite configuration you can use the viteFinal field.
// Check https://storybook.js.org/docs/react/builders/vite#configuration
// and https://nx.dev/recipes/storybook/custom-builder-configs

async function getAbsolutePath(value: string): Promise<string> {
  if (!import.meta.resolve) {
    throw new Error('import.meta.resolve is not available');
  }
  const resolved = await import.meta.resolve(`${value}/package.json`);
  return dirname(fileURLToPath(resolved));
}
