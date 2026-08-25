import { expect, test } from './fixtures';

/**
 * The six core journeys `po` specified in
 * `apps/docsite/product/journeys.md` — read that file for the full
 * checklist; each block below cites the bullets it covers and says plainly
 * what it does not.
 *
 * All of this runs against the browser+mock path (`pnpm exec nx e2e
 * synapse-e2e`, which serves `synapse:serve` — see `playwright.config.ts`).
 * That mode can prove UI logic and flow; it cannot prove that a command
 * actually reaches a device. Where a bullet needs that, the comment says so
 * and points at what already answers it (a Rust integration test against
 * the fake daemon, mode 2) or says it needs mode 3 (real hardware, only the
 * maintainer can run it).
 */

// ── §2 create a group ───────────────────────────────────────────────────────

test.describe('creates a group', () => {
	test('opens a dialog asking only for a name, and creates an empty, stopped group', async ({
		dashboard,
		page,
	}) => {
		await dashboard.newGroupButton.click();
		const dialog = page.getByRole('dialog', { name: 'New group' });

		// "no members, no ambience picker in this step" — journeys.md §2.
		await expect(dialog.getByLabel('Group name')).toBeVisible();
		await expect(dialog.getByRole('button', { name: 'Create' })).toBeVisible();
		await expect(dialog.locator('syn-select, syn-color-picker')).toHaveCount(0);

		await dialog.getByLabel('Group name').fill('Desk');
		await dialog.getByRole('button', { name: 'Create' }).click();

		await expect(dashboard.group('Desk')).toBeVisible();
		await expect(
			dashboard.group('Desk').getByText('0 participants'),
		).toBeVisible();
		expect(await dashboard.isRunning('Desk')).toBe(false);

		// Persistence across reload is Tauri+fake-daemon only — the mock has no
		// storage (see mock-groups.ts's own comment: state lives in a closure,
		// gone the moment the page does). Not exercised here; the equivalent is
		// `state_engine.rs`'s `every_change_is_on_disk_before_it_returns` and
		// `what_was_running_is_running_again_after_a_restart`, both run and
		// passing against the fake daemon as part of the baseline.
	});

	test('an empty name is refused; cancelling creates nothing', async ({
		dashboard,
		page,
	}) => {
		await dashboard.newGroupButton.click();
		const dialog = page.getByRole('dialog', { name: 'New group' });

		const create = dialog.getByRole('button', { name: 'Create' });
		await expect(create).toBeDisabled();
		await dialog.getByLabel('Group name').fill('   ');
		await expect(create).toBeDisabled();

		await dialog.getByRole('button', { name: 'Cancel' }).click();
		await expect(dialog).toHaveCount(0);
		// Not "no group-cards at all": the mock always seeds one pre-existing
		// "All devices" group when there are any participants — see
		// `mockGroups`'s own comment on mirroring the backend's first run.
		// What this proves is that cancelling created no *new* one.
		await expect(dashboard.group('Desk')).toHaveCount(0);
	});
});

// ── §3 assign and move a participant ────────────────────────────────────────

test.describe('assigns and moves a participant', () => {
	/**
	 * The keyboard-only path, end to end — journeys.md §3 is explicit that
	 * this needs verifying "not just that the buttons exist," which is the
	 * point of driving it through the real pick-up/place-here operations
	 * rather than asserting the buttons render.
	 *
	 * The pointer *drag* itself (`cdkDrag`/`cdkDropList`) is covered
	 * separately by the Storybook play in `dashboard-page.stories.ts` — see
	 * `DashboardPage.moveToGroup`'s doc comment for why it isn't duplicated
	 * here with a synthetic Playwright drag.
	 */
	test('moves a participant between groups and back to the tray by keyboard', async ({
		dashboard,
	}) => {
		await dashboard.createGroup('Desk');
		await dashboard.createGroup('Bench');

		// Named for the mock device in app.config.ts, not invented — see the
		// comment there on why the browser mock mirrors the fake daemon's
		// devices verbatim.
		const device = 'Razer Basilisk Ultimate Receiver';

		await dashboard.moveToGroup(device, 'Desk');
		await expect(dashboard.group('Desk').getByText(device)).toBeVisible();

		// "never a member of both at once, even momentarily in what's
		// rendered" — check the source card lost it in the same breath as
		// confirming the destination has it.
		await dashboard.moveToGroup(device, 'Bench');
		await expect(dashboard.group('Bench').getByText(device)).toBeVisible();
		await expect(dashboard.group('Desk').getByText(device)).toHaveCount(0);

		await dashboard.pickUp(device);
		await dashboard.placeInTray(device);
		await expect(dashboard.participant(device)).toBeVisible();
		await expect(dashboard.group('Bench').getByText(device)).toHaveCount(0);
	});

	test('picking up a participant already in a group offers nowhere to re-place it there', async ({
		dashboard,
	}) => {
		await dashboard.createGroup('Desk');
		const device = 'Razer Basilisk Ultimate Receiver';
		await dashboard.moveToGroup(device, 'Desk');

		// This is where the no-op actually lives: `group-card.html` only shows
		// "Place here" when the group does *not* already hold what is carried
		// (`@if (carrying(); as carried) { @if (!holdsCarried()) { … } }`), so
		// re-dropping a participant where it already is isn't a click that
		// does nothing — it is a control that was never offered. Confirmed by
		// its absence, not by clicking it and checking nothing changed.
		await dashboard.pickUp(device);
		await expect(
			dashboard.group('Desk').getByRole('button', { name: 'Place here' }),
		).toHaveCount(0);

		await dashboard.pickUp(device); // put it back down, unplaced
		await expect(dashboard.problem).toHaveCount(0);
		await expect(dashboard.group('Desk').getByText(device)).toBeVisible();
		await expect(
			dashboard.group('Desk').getByText('1 participant'),
		).toBeVisible();
	});

	// The `alreadyTaken` race (two readers, one stale) needs two independent
	// backend connections disagreeing about who holds a participant. The
	// browser+mock path cannot produce that: the mock is a plain object in
	// this page's own JS heap, so two tabs never share it and can't race each
	// other. Tauri+fake-daemon might, with two windows against one daemon, but
	// this app appears to be single-window — not attempted; flagged as
	// impractical to exercise in either mode available here rather than
	// skipped silently.
});

// ── §4 author an ambience ───────────────────────────────────────────────────

test.describe('authors an ambience', () => {
	/**
	 * Driven from `/studio`, which needs no group and no device — exactly
	 * the case journeys.md §4 asks to be provable on its own ("no group
	 * required to exist and no device connected... computed client-side").
	 */
	test('colour and brightness reach the preview immediately, without disturbing the other channels', async ({
		studio,
	}) => {
		// Studio starts at `still('#00ff00')`: fixed green, no motion, full
		// brightness — see `studio-page.ts`. Motion 'none' means the colour is
		// constant over time, which is what makes this assertion safe against
		// the preview's own animation loop.
		await expect(studio.colourSourceSelect()).toHaveValue('fixed');
		expect(await studio.previewColour()).toBe('rgb(0, 255, 0)');

		await studio.setFixedColour('#ff8800');
		expect(await studio.previewColour()).toBe('rgb(255, 136, 0)');

		// "Changing one channel does not reset or alter the other two."
		await expect(studio.motionSourceSelect()).toHaveValue('none');
		await expect(studio.brightnessSourceSelect()).toHaveValue('fixed');

		const beforeDimming = await studio.previewColour();
		await studio.setBrightnessLevel(40);
		await expect.poll(() => studio.previewColour()).not.toBe(beforeDimming);

		// Dimming the brightness channel must not touch colour or motion.
		await expect(studio.colourSourceSelect()).toHaveValue('fixed');
		await expect(studio.motionSourceSelect()).toHaveValue('none');

		// Sending the change to a running group without restarting it needs a
		// real group and a real (fake) device — already proven at the Rust
		// layer by `groups.rs`'s `changing_a_running_group_takes_effect_without_a_restart`,
		// run and passing against the fake daemon as part of the baseline.
		// Not re-provable here: the browser+mock path has no device to observe.
	});

	test('remembers what a channel was last tuned to when switching away and back', async ({
		studio,
	}) => {
		await studio.motionSourceSelect().selectOption('wave');
		await studio.setWaveSpeed(80);
		expect(await studio.waveSpeed()).toBe('80');

		await studio.motionSourceSelect().selectOption('none');
		await studio.motionSourceSelect().selectOption('wave');

		// Not the bare default (50) — what this session last tuned it to.
		expect(await studio.waveSpeed()).toBe('80');
	});
});

// ── §5 start and stop a group ───────────────────────────────────────────────

test.describe('starts and stops a group', () => {
	test('flips running state immediately in the UI', async ({ dashboard }) => {
		await dashboard.createGroup('Desk');
		expect(await dashboard.isRunning('Desk')).toBe(false);

		await dashboard.setRunning('Desk', true);
		expect(await dashboard.isRunning('Desk')).toBe(true);

		await dashboard.setRunning('Desk', false);
		expect(await dashboard.isRunning('Desk')).toBe(false);
	});

	// Everything else in journeys.md §5 needs a real (or fake) device to
	// observe:
	//  - each participant showing what it is achieving ("full picture" /
	//    "one colour", a rate) — `runner.rs`'s `reports_what_the_cadence_actually_cost`
	//    and `attaches_to_each_device_as_it_can_be_driven` cover the backend
	//    half against the fake daemon; the UI reading `status`/`because`
	//    correctly is not covered by this suite and would need Tauri+fake
	//    daemon, not browser+mock.
	//  - "stopping does NOT go dark" — needs a device to observe not changing.
	//    Not covered here or, as far as I can tell, by name in the Rust
	//    suite; flagged as unverified rather than assumed.
	//  - the tray-Quit defect po recorded (`stop_all` documented but not
	//    called, so devices stay lit after Quit) — needs Tauri+fake daemon or
	//    hardware, and po says `backend` is already fixing it ahead of a
	//    ticket. Requires re-checking once that lands; not attempted here.
});

// ── §6 delete a group ────────────────────────────────────────────────────────

test.describe('deletes a group', () => {
	test('requires a second confirming press, then removes the group and frees its members', async ({
		dashboard,
	}) => {
		await dashboard.createGroup('Desk');
		const device = 'Razer Basilisk Ultimate Receiver';
		await dashboard.moveToGroup(device, 'Desk');

		const card = dashboard.group('Desk');
		await card.getByRole('button', { name: 'Remove Desk' }).click();
		// First press only reveals the confirmation — nothing removed yet.
		await expect(dashboard.group('Desk')).toBeVisible();
		await card.getByRole('button', { name: 'Remove', exact: true }).click();

		await expect(dashboard.group('Desk')).toHaveCount(0);
		await expect(dashboard.participant(device)).toBeVisible();
	});

	test('a running group can be deleted', async ({ dashboard }) => {
		await dashboard.createGroup('Desk');
		await dashboard.setRunning('Desk', true);

		await dashboard.removeGroup('Desk');

		await expect(dashboard.group('Desk')).toHaveCount(0);
		await expect(dashboard.problem).toHaveCount(0);
	});
});

// ── §1 launch with no devices ────────────────────────────────────────────────

/**
 * ⚠️ Blocked, not merely unwritten.
 *
 * journeys.md §1 asks for `wired: []`, `discovered: []`, `groups: []`. The
 * browser+mock path has no way to ask for that today: `app.config.ts`
 * builds `mock.devices` from a fixed list mirroring the fake daemon's six
 * devices verbatim (deliberately — see the comment there on why it is fixed
 * rather than invented). There is no query param, `window` global, or
 * config file this test could use to request zero devices without editing
 * application code, which sits outside `apps/synapse-e2e/**` — QA's files.
 *
 * Flagged to `frontend` and `po`: needs a deliberate testability seam (e.g.
 * `makeAppConfig` reading a `?mock=empty` query param) before this can be
 * written at all, `fixme` or otherwise. Left here, unwritten, so the gap is
 * visible rather than silently absent from the suite.
 *
 * Separately, and not covered by anything in this suite: journeys.md §1's
 * "known defect" bullet about `modulesResolver` throwing under real Tauri
 * (ticket 0001) needs Tauri+fake daemon to observe at all — the mock answers
 * `[]` silently, which is exactly why the defect is invisible here.
 */
test.fixme('launches with no devices', async ({ page }) => {
	await page.goto('/dashboard');
	await expect(page.getByText('No Razer devices found.')).toBeVisible();
});
