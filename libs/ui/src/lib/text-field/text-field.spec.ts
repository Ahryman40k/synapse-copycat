import { render, screen } from '@testing-library/angular';
import { TextField } from './text-field';

/**
 * The two outputs are the point of this component and are what these assert:
 * `value` follows every keystroke, `committed` fires only when the user has
 * settled on something. A caller wiring a rename to `valueChange` would send
 * one command per letter typed.
 *
 * Driven with plain DOM events rather than `user-event`, which this workspace
 * does not depend on — the switch spec beside this one does the same.
 */
const setup = async (inputs: Record<string, unknown> = {}) => {
	const rendered = await render(TextField, { inputs });
	const committed: string[] = [];
	rendered.fixture.componentInstance.committed.subscribe((value) =>
		committed.push(value),
	);
	return { ...rendered, committed };
};

const field = () => screen.getByRole('textbox') as HTMLInputElement;

/** What typing amounts to, as far as the component can observe it. */
const typeInto = (input: HTMLInputElement, text: string) => {
	input.focus();
	input.value = text;
	input.dispatchEvent(new Event('input', { bubbles: true }));
};

const press = (input: HTMLInputElement, key: string) =>
	input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

describe('TextField', () => {
	it('is a real text input', async () => {
		await setup({ ariaLabel: 'Group name' });

		expect(screen.getByRole('textbox', { name: 'Group name' })).toBeVisible();
	});

	it('follows every keystroke in the model', async () => {
		const { fixture } = await setup({ ariaLabel: 'Group name' });

		typeInto(field(), 'Desk');

		expect(fixture.componentInstance.value()).toBe('Desk');
	});

	it('shows a value set from outside', async () => {
		const { fixture } = await setup({ ariaLabel: 'Group name' });

		fixture.componentInstance.value.set('Desk');
		fixture.detectChanges();

		expect(field().value).toBe('Desk');
	});

	it('commits on Enter', async () => {
		const { committed } = await setup({ ariaLabel: 'Group name' });

		typeInto(field(), 'Desk');
		press(field(), 'Enter');

		expect(committed).toEqual(['Desk']);
	});

	it('commits once, not twice, when Enter is followed by leaving', async () => {
		// Enter blurs, and blur is what commits. Committing in the key handler
		// as well would send the same rename twice.
		const { committed } = await setup({ ariaLabel: 'Group name' });

		typeInto(field(), 'Desk');
		press(field(), 'Enter');
		field().blur();

		expect(committed).toEqual(['Desk']);
	});

	it('commits on leaving the field', async () => {
		const { committed } = await setup({ ariaLabel: 'Group name' });

		typeInto(field(), 'Desk');
		field().blur();

		expect(committed).toEqual(['Desk']);
	});

	it('says nothing when the value did not change', async () => {
		const { committed } = await setup({
			ariaLabel: 'Group name',
			value: 'Desk',
		});

		field().focus();
		field().blur();

		expect(committed).toEqual([]);
	});

	it('puts back what was there when Escape is pressed', async () => {
		// Abandoning an edit is something people expect to be able to do, and a
		// rename committed on the way out would have no way back.
		const { fixture, committed } = await setup({
			ariaLabel: 'Group name',
			value: 'Desk',
		});

		typeInto(field(), 'Desk lights');
		press(field(), 'Escape');
		fixture.detectChanges();

		expect(fixture.componentInstance.value()).toBe('Desk');
		expect(field().value).toBe('Desk');
		expect(committed).toEqual([]);
	});

	it('cannot be typed in when disabled', async () => {
		await setup({ ariaLabel: 'Group name', disabled: true });

		expect(field()).toBeDisabled();
	});
});
