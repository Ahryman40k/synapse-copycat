import { render, screen } from '@testing-library/angular';
import { ButtonGroup, type ButtonGroupOption } from './button-group';

const RATES: ButtonGroupOption[] = [
	{ value: '125', label: '125 Hz' },
	{ value: '500', label: '500 Hz' },
	{ value: '1000', label: '1000 Hz' },
];

const setup = (inputs: Record<string, unknown> = {}) =>
	render(ButtonGroup, {
		inputs: { options: RATES, ariaLabel: 'Polling rate', ...inputs },
	});

const option = (name: string) =>
	screen.getByRole('radio', { name }) as HTMLInputElement;

describe('ButtonGroup', () => {
	it('is a named radio group, not a row of buttons', async () => {
		await setup();

		// "One of these" is a radio group: that is what gives the arrow keys, the
		// single tab stop, and the "2 of 3" a screen reader announces.
		expect(
			screen.getByRole('radiogroup', { name: 'Polling rate' }),
		).toBeVisible();
		expect(screen.getAllByRole('radio')).toHaveLength(3);
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	it('takes nothing until told to', async () => {
		await setup();

		for (const radio of screen.getAllByRole('radio')) {
			expect(radio).not.toBeChecked();
		}
	});

	it('reflects the model', async () => {
		await setup({ value: '500' });

		expect(option('500 Hz')).toBeChecked();
		expect(option('125 Hz')).not.toBeChecked();
	});

	it('takes exactly one at a time', async () => {
		const { fixture } = await setup({ value: '500' });

		option('1000 Hz').click();
		fixture.detectChanges();

		expect(
			screen
				.getAllByRole('radio')
				.filter((r) => (r as HTMLInputElement).checked),
		).toHaveLength(1);
		expect(option('1000 Hz')).toBeChecked();
	});

	it('writes a choice back into the model', async () => {
		const { fixture } = await setup();

		option('125 Hz').click();
		fixture.detectChanges();

		expect(fixture.componentInstance.value()).toBe('125');
	});

	it('keeps its radios out of another group on the same page', async () => {
		const { container } = await render(
			`<syn-button-group [options]="options" ariaLabel="First"></syn-button-group>
			 <syn-button-group [options]="options" ariaLabel="Second"></syn-button-group>`,
			{ imports: [ButtonGroup], componentProperties: { options: RATES } },
		);

		// Sharing a name would make the two groups one, and choosing in either
		// would clear the other.
		const names = new Set(
			[...container.querySelectorAll('input')].map((input) => input.name),
		);
		expect(names.size).toBe(2);
	});

	it('keeps its name when a choice is drawn as an icon', async () => {
		const { container } = await setup({
			options: [
				{ value: 'up', label: 'Upwards', icon: 'M12 19V5M5 12l7-7 7 7' },
				{ value: 'down', label: 'Downwards', icon: 'M12 5v14M19 12l-7 7-7-7' },
			],
			ariaLabel: 'Wave direction',
		});

		// An icon-only choice that announces nothing is the usual way this
		// pattern is got wrong: the pill holds no text, so the name has to come
		// from the radio itself.
		expect(option('Upwards')).toBeInTheDocument();
		expect(container.querySelectorAll('svg')).toHaveLength(2);
		// Decoration — the radio already carries the name.
		for (const svg of container.querySelectorAll('svg')) {
			expect(svg).toHaveAttribute('aria-hidden', 'true');
		}
	});

	it('disables one option without disabling the group', async () => {
		await setup({
			options: [...RATES, { value: '8000', label: '8000 Hz', disabled: true }],
		});

		expect(option('8000 Hz')).toBeDisabled();
		expect(option('125 Hz')).toBeEnabled();
	});

	it('disables the whole group and marks the host', async () => {
		const { fixture } = await setup({ disabled: true });

		for (const radio of screen.getAllByRole('radio')) {
			expect(radio).toBeDisabled();
		}
		expect(fixture.nativeElement).toHaveClass('syn-button-group--disabled');
	});
});
