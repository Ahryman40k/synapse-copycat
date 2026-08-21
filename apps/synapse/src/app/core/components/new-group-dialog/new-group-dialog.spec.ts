import { DialogRef } from '@angular/cdk/dialog';
import { render, screen } from '@testing-library/angular';
import { NewGroupDialog } from './new-group-dialog';

/**
 * The dialog answers with a name, or with nothing when it is cancelled.
 *
 * Rendered with a stand-in `DialogRef`, which is the whole of its contract with
 * the outside: there is no shared open/closed flag to get out of step with.
 */
const setup = async () => {
	const closed: (string | undefined)[] = [];
	let shut = false;

	const ref = {
		close: (result: string | undefined) => {
			// The CDK ignores a second close on a ref that is already gone; the
			// stand-in has to as well, or it would hide the very thing these
			// tests are checking.
			if (shut) return;
			shut = true;
			closed.push(result);
		},
	};

	const rendered = await render(NewGroupDialog, {
		providers: [{ provide: DialogRef, useValue: ref }],
	});

	return { ...rendered, closed };
};

const field = () =>
	screen.getByRole('textbox', { name: 'Group name' }) as HTMLInputElement;

const type = (text: string) => {
	const input = field();
	input.focus();
	input.value = text;
	input.dispatchEvent(new Event('input', { bubbles: true }));
};

describe('NewGroupDialog', () => {
	it('cannot be confirmed with no name', async () => {
		await setup();

		expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
	});

	it('answers with the name', async () => {
		const { fixture, closed } = await setup();

		type('Desk');
		fixture.detectChanges();
		screen.getByRole('button', { name: 'Create' }).click();

		expect(closed).toEqual(['Desk']);
	});

	it('trims the name', async () => {
		const { fixture, closed } = await setup();

		type('  Desk  ');
		fixture.detectChanges();
		screen.getByRole('button', { name: 'Create' }).click();

		expect(closed).toEqual(['Desk']);
	});

	it('answers once, not twice, when Create is clicked', async () => {
		// Clicking Create blurs the field first. Only the submit may answer.
		const { fixture, closed } = await setup();

		type('Desk');
		fixture.detectChanges();

		field().dispatchEvent(new Event('blur'));
		screen.getByRole('button', { name: 'Create' }).click();

		expect(closed).toEqual(['Desk']);
	});

	it('does not confirm when the field is merely left', async () => {
		// ⚠️ The bug this shape exists to prevent. Wiring the field's
		// `committed` to create looked equivalent and was not: it also fires on
		// blur, and clicking Cancel blurs the field first — so cancelling
		// created the group.
		const { fixture, closed } = await setup();

		type('Desk');
		fixture.detectChanges();
		field().dispatchEvent(new Event('blur'));

		expect(closed).toEqual([]);
	});

	it('answers with nothing when cancelled', async () => {
		const { fixture, closed } = await setup();

		type('Desk');
		fixture.detectChanges();
		screen.getByRole('button', { name: 'Cancel' }).click();

		// Not the name typed: cancelling is not a quieter way of confirming.
		expect(closed).toEqual([undefined]);
	});
});
