import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
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
	// ⚠️ `'../public'`, **not** `'..'`. Serving the project root swept the whole
	// of `apps/synapse/` into the static build — including `src-tauri/target/`,
	// which is 15 GB of Rust artifacts once anyone has run `cargo build`, and
	// which fails the copy outright: cargo hardlinks its binaries and Node's
	// recursive `cp` cannot set timestamps on them (`ENOENT … utime`).
	//
	// The build was green for as long as nobody had built the Rust locally, so
	// this broke on contact with a second person rather than on the change that
	// caused it. `'../src'` is what actually serves `assets/**`.
	staticDirs: ['../public', '../src'],
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
