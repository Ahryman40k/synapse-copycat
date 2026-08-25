import type { Locator, Page } from '@playwright/test';

/**
 * Page object for the dashboard — the one route the browser+mock path has
 * anything interesting on (see `app.routes.ts`: everything else is settings
 * or a lazy page reached from it).
 *
 * Locators go through accessible names — `getByRole`/`getByLabel` — rather
 * than CSS classes, matching how the components actually expose themselves
 * (see `dashboard-page.html`, `group-card.html`, `participant-card.html`: an
 * `aria-label` on every button and switch that does anything). That is also
 * what the CDK's keyboard-only drag alternative relies on, so testing through
 * the same names exercises the same path a screen reader or a keyboard-only
 * user would.
 */
export class DashboardPage {
	constructor(private readonly page: Page) {}

	async goto(): Promise<void> {
		await this.page.goto('/dashboard');
	}

	// ── page-level ──────────────────────────────────────────────────────────

	/** The live region a refused command is reported into — see dashboard-page.ts `#report`. */
	get problem(): Locator {
		return this.page.getByRole('status');
	}

	get newGroupButton(): Locator {
		return this.page.getByRole('button', { name: 'New group' });
	}

	get noDevicesMessage(): Locator {
		return this.page.getByText('No Razer devices found.');
	}

	get noGroupsMessage(): Locator {
		return this.page.getByText(
			'No group yet. Everything below is waiting for one.',
		);
	}

	// ── groups ──────────────────────────────────────────────────────────────

	/**
	 * The card for one group, scoped by its current name.
	 *
	 * The heading is the rename button (`group-card.html`), and it has no
	 * `aria-label` of its own, so its accessible name is exactly the group's
	 * name — which is also what makes this brittle across a rename mid-test.
	 * Re-fetch by the new name after one.
	 */
	group(name: string): Locator {
		return this.page
			.locator('group-card')
			.filter({ has: this.page.getByRole('button', { name, exact: true }) });
	}

	async createGroup(name: string): Promise<void> {
		await this.newGroupButton.click();
		const dialog = this.page.getByRole('dialog', { name: 'New group' });
		await dialog.getByLabel('Group name').fill(name);
		await dialog.getByRole('button', { name: 'Create' }).click();
	}

	async isRunning(groupName: string): Promise<boolean> {
		return this.group(groupName)
			.getByRole('switch', { name: `Run ${groupName}` })
			.isChecked();
	}

	/**
	 * The label wrapping the switch, not the `<input role="switch">` itself.
	 *
	 * `switch.html` keeps the input visually hidden but not `display: none`,
	 * with the decorative `.syn-switch__track` painted on top of it — correct
	 * for a real click, which a browser forwards from anywhere inside the
	 * `<label>` to the control it wraps, but it fails Playwright's
	 * actionability check when aimed at the input directly: the track (not
	 * the input) is what `elementFromPoint` returns there, and the input has
	 * no descendant relationship to fall back on. The label does, since the
	 * track is one of *its* descendants — so click the label instead.
	 */
	private switchLabel(groupName: string): Locator {
		return this.group(groupName)
			.locator('label.syn-switch__control')
			.filter({
				has: this.page.getByRole('switch', { name: `Run ${groupName}` }),
			});
	}

	async setRunning(groupName: string, running: boolean): Promise<void> {
		if ((await this.isRunning(groupName)) !== running) {
			await this.switchLabel(groupName).click();
		}
	}

	/**
	 * The two-press removal in `group-card.html`: the first press only reveals
	 * the confirmation, the second is what actually costs something.
	 *
	 * ⚠️ `exact: true` on the second press is load-bearing, not decoration.
	 * `getByRole`'s `name` matches by substring by default, and the header's
	 * `Remove ${groupName}` button is always in the DOM — so without `exact`,
	 * a query for a button named "Remove" resolves to that one instantly
	 * (before the confirmation even renders) rather than waiting for the
	 * "Remove" button inside `.group-card__confirm`, and the group never
	 * actually gets removed.
	 */
	async removeGroup(groupName: string): Promise<void> {
		const card = this.group(groupName);
		await card.getByRole('button', { name: `Remove ${groupName}` }).click();
		await card.getByRole('button', { name: 'Remove', exact: true }).click();
	}

	async memberCount(groupName: string): Promise<string | null> {
		return this.group(groupName)
			.locator('.group-card__participants h3')
			.textContent();
	}

	/** Opens the `<details>` disclosure holding the cadence select and the ambience-panel. */
	async openSettings(groupName: string): Promise<void> {
		await this.group(groupName).locator('summary').click();
	}

	ambiencePanel(groupName: string): Locator {
		return this.group(groupName).locator('ambience-panel');
	}

	// ── participants ──────────────────────────────────────────────────────

	/**
	 * A participant tile, wherever it currently sits — the tray or a group.
	 * Named by what the tile shows: the device name, or the raw participant id
	 * for one this application cannot describe (see `participant-card.ts`
	 * `name` computed).
	 */
	participant(name: string): Locator {
		return this.page
			.locator('participant-card')
			.filter({ has: this.page.getByText(name, { exact: true }) });
	}

	/**
	 * Picks a participant up by its drag handle — the keyboard-reachable half
	 * of the move, present because the CDK (and the platform) has no keyboard
	 * equivalent for the pointer drag itself. See the ⚠️ in
	 * `participant-card.html` and root AGENTS.md §4.
	 */
	async pickUp(participantName: string): Promise<void> {
		await this.participant(participantName)
			.getByRole('button', { name: `Move ${participantName}` })
			.click();
	}

	/** Places whatever is currently picked up into the named group. */
	async placeInGroup(groupName: string): Promise<void> {
		await this.group(groupName)
			.getByRole('button', { name: 'Place here' })
			.click();
	}

	/** Places whatever is currently picked up back in the tray. */
	async placeInTray(participantName: string): Promise<void> {
		await this.page
			.getByRole('button', { name: `Take ${participantName} out of its group` })
			.click();
	}

	/**
	 * Moves a participant into a group via pick-up/place-here rather than a
	 * pointer drag.
	 *
	 * Deliberate: this exercises the exact same operation the pointer drag
	 * does (`moveParticipant` / `setGroupMembers` on `ApplicationStore`), and
	 * it is the one every input modality can reach. The pointer gesture itself
	 * — `cdkDrag`/`cdkDropList` — is proven separately by the Storybook play
	 * in `dashboard-page.stories.ts`, which is the only suite that can drive a
	 * real drag (jsdom, underneath the vitest specs, cannot). Duplicating that
	 * with a synthetic Playwright drag would cost more than it proves; see
	 * root AGENTS.md §4 on why the synthetic mousedown is finicky even where
	 * it is done.
	 */
	async moveToGroup(participantName: string, groupName: string): Promise<void> {
		await this.pickUp(participantName);
		await this.placeInGroup(groupName);
	}
}
