import { test as base } from '@playwright/test';
import { DashboardPage } from './pages/dashboard-page';
import { StudioPage } from './pages/studio-page';

/**
 * Adds the app's page objects to Playwright's own fixtures.
 *
 * Every test here runs against the browser+mock path (`app.config.ts`,
 * `withMock`) — see root AGENTS.md §1 and §7. Each test gets a fresh `page`
 * from Playwright, and with it a fresh bootstrap of the whole app: the
 * mock's state (`mockGroups`, `mockTwinkly`) lives in closures built inside
 * `makeAppConfig`, created anew every time `bootstrapApplication` runs. A
 * fresh page is therefore a fresh mock, with no explicit reset step needed —
 * as long as each test navigates through this fixture rather than reusing
 * another test's page or tab.
 */
export const test = base.extend<{
	dashboard: DashboardPage;
	studio: StudioPage;
}>({
	dashboard: async ({ page }, use) => {
		const dashboard = new DashboardPage(page);
		await dashboard.goto();
		await use(dashboard);
	},

	studio: async ({ page }, use) => {
		const studio = new StudioPage(page);
		await studio.goto();
		await use(studio);
	},
});

export { expect } from '@playwright/test';
