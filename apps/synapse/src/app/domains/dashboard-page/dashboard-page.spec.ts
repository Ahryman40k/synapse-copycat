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
			kind: 'mouse',
			name: 'Basilisk Ultimate',
			vendor_id: 5426,
			product_id: 136,
		},
		{
			kind: 'keyboard',
			name: 'Huntsman Elite',
			vendor_id: 5426,
			product_id: 550,
		},
	],
	modules: [],
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
	await store.getGroups();
	rendered.fixture.detectChanges();

	return { ...rendered, store };
};

const click = (name: string | RegExp) => screen.getByRole('button', { name });

describe('DashboardPage', () => {
	it('shows the group the backend starts with, and its members', async () => {
		await setup(['5426-0136', '5426-0550']);

		expect(screen.getByText('All devices')).toBeVisible();
		expect(screen.getByText('2 participants')).toBeVisible();
		// Named tiles, inside the group driving them.
		expect(screen.getByText('Huntsman Elite')).toBeVisible();
	});

	it('takes a participant out of its group', async () => {
		// Not an error and not a deletion: leaving a device out is a legitimate
		// arrangement — an unlit keyboard while the rest of the desk breathes.
		const { fixture } = await setup(['5426-0136', '5426-0550']);

		click('Move Huntsman Elite').click();
		fixture.detectChanges();

		click(/Take Huntsman Elite out/).click();

		await waitFor(() => {
			expect(screen.getByText('1 participant')).toBeVisible();
		});
	});

	it('does not offer to take out a device nothing is holding', async () => {
		const { fixture } = await setup(['5426-0136', '5426-0550']);

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
	it('creates a group, empty and stopped', async () => {
		const { fixture } = await setup(['5426-0136']);

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
