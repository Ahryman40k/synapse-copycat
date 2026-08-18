import { render, screen } from '@testing-library/angular';
import { AssignmentEditor } from './assignment-editor';

const CONTROL = { id: 'button-5', label: 'Forward' };

const setup = (inputs: Record<string, unknown> = {}) =>
	render(AssignmentEditor, { inputs });

const kind = () =>
	screen.getByRole('combobox', { name: 'Assign to' }) as HTMLSelectElement;

const choose = async (value: string, fixture: { detectChanges(): void }) => {
	kind().value = value;
	kind().dispatchEvent(new Event('change'));
	fixture.detectChanges();
};

describe('AssignmentEditor', () => {
	it('asks for a control before it can say anything', async () => {
		await setup();

		expect(screen.getByText('Pick a control to assign it.')).toBeVisible();
		expect(screen.queryByRole('combobox', { name: 'Assign to' })).toBeNull();
	});

	it('names the control it is editing', async () => {
		await setup({ control: CONTROL });

		expect(screen.getByRole('heading', { name: 'Forward' })).toBeVisible();
	});

	it('offers every category, starting on default', async () => {
		await setup({ control: CONTROL });

		expect(
			screen.getAllByRole('option').map((o) => o.textContent?.trim()),
		).toEqual([
			'Default',
			'Keyboard function',
			'Mouse function',
			'Sensitivity',
			'Text function',
			'Disable',
		]);
		expect(kind().value).toBe('default');
	});

	it('swaps the editor with the category', async () => {
		const { fixture } = await setup({ control: CONTROL });

		await choose('mouse', fixture);
		expect(
			screen.getByRole('combobox', { name: 'Mouse function' }),
		).toBeVisible();

		await choose('keyboard', fixture);
		expect(
			screen.getByRole('button', { name: 'Key combination' }),
		).toBeVisible();
		expect(
			screen.queryByRole('combobox', { name: 'Mouse function' }),
		).toBeNull();
	});

	it('replaces the assignment rather than merging into it', async () => {
		const { fixture } = await setup({
			control: CONTROL,
			assignment: { kind: 'text', text: 'gg' },
		});

		await choose('disabled', fixture);

		// One shape per kind, so there is nothing to carry across.
		expect(fixture.componentInstance.assignment()).toEqual({
			kind: 'disabled',
		});
	});

	it('reflects an assignment set from outside', async () => {
		await setup({
			control: CONTROL,
			assignment: { kind: 'sensitivity', action: 'clutch' },
		});

		expect(kind().value).toBe('sensitivity');
		expect(
			screen.getByRole('combobox', { name: 'Sensitivity function' }),
		).toHaveValue('clutch');
	});

	it('reports a mouse function through the model', async () => {
		const { fixture } = await setup({ control: CONTROL });
		await choose('mouse', fixture);

		const action = screen.getByRole('combobox', {
			name: 'Mouse function',
		}) as HTMLSelectElement;
		action.value = 'back';
		action.dispatchEvent(new Event('change'));
		fixture.detectChanges();

		expect(fixture.componentInstance.assignment()).toEqual({
			kind: 'mouse',
			action: 'back',
		});
	});
});
