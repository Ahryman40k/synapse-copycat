import { render, screen, waitFor } from '@testing-library/angular';
import {
	type Mock,
	mockGroups,
	provideBackendApi,
	unusedCommands,
	withMock,
} from '@synapse-copycat/backend-api';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { ApplicationStore } from '../../core/stores/application-store';
import { DashboardPage } from './dashboard-page';

/**
 * The dashboard against the real store and the stateful mock.
 *
 * Its job is now a set of commands — create, move, release — and a fixture of
 * frozen state cannot tell whether any of them are wired. `mockGroups` keeps
 * the one rule that matters, so this fails for the same reasons the
 * application would.
 */
const backend = (participants: string[]): Mock => ({
	...unusedCommands(),
	devices: [
		{
			serial: 'XX0000000088',
			kind: 'mouse',
			name: 'Basilisk Ultimate',
			vendor_id: 5426,
			product_id: 136,
		},
		{
			serial: 'XX0000000226',
			kind: 'keyboard',
			name: 'Huntsman Elite',
			vendor_id: 5426,
			product_id: 550,
		},
	],
	twinkly_devices: [
		{
			participant: 'twinkly-1c9dc285dd79',
			name: 'Twinkly_85DD79',
			address: '192.168.1.201',
			product_code: 'TWS050STQ',
			leds: 50,
			profile: 'RGB',
		},
	],
	...mockGroups(participants),
});

const setup = async (participants: string[]) => {
	const rendered = await render(DashboardPage, {
		providers: [
			provideRouter([]),
			provideBackendApi(withMock(backend(participants))),
		],
	});

	// The resolvers fill the store in the application; here nothing does.
	const store = TestBed.inject(ApplicationStore);
	await store.getDevices();
	await store.getDiscovered();
	await store.getGroups();
	rendered.fixture.detectChanges();

	return { ...rendered, store };
};

const click = (name: string | RegExp) => screen.getByRole('button', { name });

describe('DashboardPage', () => {
	it('shows a network device beside the wired ones', async () => {
		// ⚠️ It arrived over UDP rather than DBus, and nothing on the page knows
		// that. A participant is a participant — which is what makes adding
		// Govee one more source rather than one more branch everywhere.
		await setup(['XX0000000088']);

		expect(screen.getByText('Twinkly_85DD79')).toBeVisible();
		// Nothing drives it yet, so it waits in the tray like any unclaimed
		// device rather than being hidden until the engine can paint it.
		const tray = document.querySelector('.dashboard-page__tray') as HTMLElement;
		expect(tray.textContent).toContain('Twinkly_85DD79');
	});

	it('shows the group the backend starts with, and its members', async () => {
		await setup(['XX0000000088', 'XX0000000226']);

		expect(screen.getByText('All devices')).toBeVisible();
		expect(screen.getByText('2 participants')).toBeVisible();
		// Named tiles, inside the group driving them.
		expect(screen.getByText('Huntsman Elite')).toBeVisible();
	});

	it('takes a participant out of its group', async () => {
		// Not an error and not a deletion: leaving a device out is a legitimate
		// arrangement — an unlit keyboard while the rest of the desk breathes.
		const { fixture } = await setup(['XX0000000088', 'XX0000000226']);

		click('Move Huntsman Elite').click();
		fixture.detectChanges();

		click(/Take Huntsman Elite out/).click();

		await waitFor(() => {
			expect(screen.getByText('1 participant')).toBeVisible();
		});
	});

	it('does not offer to take out a device nothing is holding', async () => {
		const { fixture } = await setup(['XX0000000088', 'XX0000000226']);

		// Out first, so it is sitting in the tray.
		click('Move Huntsman Elite').click();
		fixture.detectChanges();
		click(/Take Huntsman Elite out/).click();
		await waitFor(() => {
			expect(screen.getByText('1 participant')).toBeVisible();
		});

		// Picked up again — but no group holds it now, so an offer to take it
		// out would be a button that does nothing when pressed.
		click('Move Huntsman Elite').click();
		fixture.detectChanges();

		expect(
			screen.queryByRole('button', { name: /Take Huntsman Elite out/ }),
		).not.toBeInTheDocument();
	});

	// ⚠️ The dialog is rendered into the CDK's overlay container, which is
	// attached to the body and not to the fixture. `screen` reaches it; a query
	// scoped to the rendered component would not.
	it('removes a group, after asking', async () => {
		// ⚠️ Two presses. The groups are written to disk as soon as they change,
		// so a mis-click is a rebuild and there is no undo.
		const { fixture, store } = await setup(['XX0000000088']);

		click('Remove All devices').click();
		fixture.detectChanges();
		click('Remove').click();

		await waitFor(() => {
			expect(store.groups()).toHaveLength(0);
		});
		// The participant is not deleted with it — it goes back to waiting.
		expect(store.unassigned()).toContain('XX0000000088');
	});

	it('leaves a group alone when the removal is backed out of', async () => {
		const { fixture, store } = await setup(['XX0000000088']);

		click('Remove All devices').click();
		fixture.detectChanges();
		click('Keep it').click();
		fixture.detectChanges();

		expect(store.groups()).toHaveLength(1);
	});

	it('creates a group, empty and stopped', async () => {
		const { fixture } = await setup(['XX0000000088']);

		click(/New group/).click();
		fixture.detectChanges();

		const name = screen.getByRole('textbox', {
			name: 'Group name',
		}) as HTMLInputElement;
		name.value = 'Desk';
		name.dispatchEvent(new Event('input', { bubbles: true }));
		fixture.detectChanges();

		click('Create').click();

		await waitFor(() => {
			expect(screen.getByRole('heading', { name: 'Desk' })).toBeVisible();
		});
		// A container first: what goes in it and whether it draws are the next
		// two decisions, both one gesture away on the card that just appeared.
		expect(screen.getByRole('switch', { name: 'Run Desk' })).not.toBeChecked();
		expect(screen.getByText('0 participants')).toBeVisible();
	});
});
