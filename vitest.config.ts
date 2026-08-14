import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// Scoped to the Nx project roots so build output under `dist/` (which
		// contains a copy of a project's vite config) is not picked up as a
		// duplicate project.
		projects: [
			'apps/*/vite.config.{mjs,js,ts,mts}',
			'apps/*/vitest.config.{mjs,js,ts,mts}',
			'libs/*/vite.config.{mjs,js,ts,mts}',
			'libs/*/vitest.config.{mjs,js,ts,mts}',
		],
	},
});
