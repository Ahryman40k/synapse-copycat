import { workspaceRoot } from '@nx/devkit';
import { nxE2EPreset } from '@nx/playwright/preset';
import { defineConfig, devices } from '@playwright/test';

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env['BASE_URL'] || 'http://localhost:4200';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
	...nxE2EPreset(__filename, { testDir: './src' }),
	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
		baseURL,
		/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
		trace: 'on-first-retry',
	},
	/* Run your local dev server before starting the tests */
	webServer: {
		command: 'pnpm exec nx run synapse:serve',
		url: 'http://localhost:4200',
		// Reuse a server a developer already has open (fast local iteration:
		// `nx serve synapse` in one terminal, `nx e2e synapse-e2e` in another),
		// but never in CI. `reuseExistingServer: true` unconditionally has the
		// same hazard the Storybook target (`nx run synapse:test-storybook`)
		// guards against with an explicit port check: it will happily test
		// whatever is already answering on 4200, including a stale build left
		// behind by a crashed previous run. CI has no legitimate reason for
		// something to already be on this port, so there `false` turns that
		// hazard into a clean startup failure instead of a silent pass against
		// stale content.
		reuseExistingServer: !process.env['CI'],
		cwd: workspaceRoot,
	},
	// Chromium only. The three-engine template triples the run for a UI whose
	// only shipping target is a Tauri webview on Linux (WebKitGTK) — and
	// neither Playwright's `webkit` (upstream WebKit, not WebKitGTK) nor
	// `firefox` gets closer to that than `chromium` does. Browser+mock e2e was
	// never going to prove anything about the webview either way: per root
	// AGENTS.md §1 this mode exists to prove UI logic and flows without a
	// backend, and mode 3 (real hardware, real webview) is the only one that
	// can speak to fidelity — and only the maintainer can run it. Re-add
	// firefox/webkit here if cross-engine DOM/CSS bugs actually show up; until
	// then it is 3x the runtime for a browser nothing ships with.
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},

		// Uncomment for mobile browsers support
		/* {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    }, */

		// Uncomment for branded browsers
		/* {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    } */
	],
});
