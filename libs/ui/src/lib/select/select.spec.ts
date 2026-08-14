import { render, screen } from '@testing-library/angular';
import { Select, type SelectOption } from './select';

const OPTIONS: SelectOption[] = [
	{ value: 'static', label: 'Static' },
	{ value: 'spectrum', label: 'Spectrum' },
	{ value: 'wave', label: 'Wave' },
	{ value: 'reactive', label: 'Reactive', disabled: true },
];

const setup = (inputs: Record<string, unknown> = {}) =>
	render(Select, {
		inputs: { options: OPTIONS, ariaLabel: 'Effect', ...inputs },
	});

const field = () => screen.getByRole('combobox') as HTMLSelectElement;

describe('Select', () => {
	it('exposes a real select to assistive technology', async () => {
		await setup();

		expect(screen.getByRole('combobox', { name: 'Effect' })).toBeVisible();
	});

	it('renders every option', async () => {
		await setup();

		const options = screen.getAllByRole('option');
		expect(options).toHaveLength(4);
		expect(options[1]).toHaveTextContent('Spectrum');
	});

	it('is in the tab order and focusable', async () => {
		await setup();

		field().focus();

		expect(field()).toHaveFocus();
	});

	it('shows the first option when the model is empty', async () => {
		await setup();

		// Native behaviour, not something the component decides.
		expect(field().value).toBe('static');
	});

	it('reflects the model', async () => {
		await setup({ value: 'wave' });

		expect(field().value).toBe('wave');
	});

	it('writes a user choice back into the model', async () => {
		const { fixture } = await setup();

		field().value = 'spectrum';
		field().dispatchEvent(new Event('change'));
		fixture.detectChanges();

		expect(fixture.componentInstance.value()).toBe('spectrum');
	});

	it('follows a value set from outside', async () => {
		const { fixture } = await setup({ value: 'static' });

		fixture.componentInstance.value.set('wave');
		fixture.detectChanges();

		expect(field().value).toBe('wave');
	});

	it('disables an individual option', async () => {
		await setup();

		expect(screen.getByRole('option', { name: 'Reactive' })).toBeDisabled();
	});

	it('disables the whole control and marks the host', async () => {
		const { fixture } = await setup({ disabled: true });

		expect(field()).toBeDisabled();
		expect(fixture.nativeElement).toHaveClass('syn-select--disabled');
	});

	it('takes its accessible name from a projected label', async () => {
		await render('<syn-select [options]="options">Effect</syn-select>', {
			imports: [Select],
			componentProperties: { options: OPTIONS },
		});

		// Inside a <label>, so the text names the control without an aria-label.
		expect(screen.getByRole('combobox', { name: 'Effect' })).toBeVisible();
	});
});
