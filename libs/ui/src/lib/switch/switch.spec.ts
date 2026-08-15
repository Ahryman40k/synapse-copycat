import { render, screen } from '@testing-library/angular';
import { SwitchComponent } from './switch';

/**
 * The previous implementation toggled from a `(click)` on the host while the
 * input was zero-sized, and mirrored state with `[attr.checked]` — the HTML
 * attribute, which is only the default value and diverges from the property as
 * soon as the user interacts. Both are asserted against here.
 */
const setup = (inputs: Record<string, unknown> = {}) =>
	render(SwitchComponent, { inputs });

const control = () => screen.getByRole('switch') as HTMLInputElement;

describe('Switch', () => {
	it('is announced as a switch, not as a checkbox', async () => {
		await setup({ ariaLabel: 'Brightness' });

		expect(screen.getByRole('switch', { name: 'Brightness' })).toBeVisible();
		expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
	});

	it('is in the tab order and focusable', async () => {
		await setup({ ariaLabel: 'Brightness' });

		control().focus();

		expect(control()).toHaveFocus();
	});

	it('reflects the model as a property, not an attribute', async () => {
		const { fixture } = await setup({ ariaLabel: 'Brightness' });

		fixture.componentInstance.checked.set(true);
		fixture.detectChanges();

		// The property is what `:checked` and assistive technology read.
		expect(control().checked).toBe(true);
	});

	it('writes a user toggle back into the model', async () => {
		const { fixture } = await setup({ ariaLabel: 'Brightness' });

		control().click();
		fixture.detectChanges();

		expect(fixture.componentInstance.checked()).toBe(true);
	});

	it('toggles exactly once per click', async () => {
		// The `label[syn-switch]` selector used to make the native label and the
		// host click handler both fire, cancelling each other out — which showed
		// up as a switch that never changed. A double toggle would leave `false`
		// after the first click here.
		const { fixture } = await setup({ ariaLabel: 'Brightness' });
		const seen: boolean[] = [];

		for (let i = 0; i < 3; i++) {
			control().click();
			fixture.detectChanges();
			seen.push(fixture.componentInstance.checked());
		}

		expect(seen).toEqual([true, false, true]);
	});

	it('disables the native input and marks the host', async () => {
		const { fixture } = await setup({
			ariaLabel: 'Brightness',
			disabled: true,
		});

		expect(control()).toBeDisabled();
		expect(fixture.nativeElement).toHaveClass('syn-switch--disabled');
	});

	it('does not change when disabled', async () => {
		const { fixture } = await setup({
			ariaLabel: 'Brightness',
			disabled: true,
		});

		control().click();
		fixture.detectChanges();

		expect(fixture.componentInstance.checked()).toBe(false);
	});

	it('associates a projected label with the control', async () => {
		const { fixture } = await render('<syn-switch>Brightness</syn-switch>', {
			imports: [SwitchComponent],
		});

		const label = fixture.nativeElement.querySelector('.syn-switch__label');
		expect(label?.textContent).toContain('Brightness');

		(label as HTMLElement).click();
		fixture.detectChanges();

		expect(control().checked).toBe(true);
	});

	it('puts the label after the track by default', async () => {
		const { container } = await render('<syn-switch>Brightness</syn-switch>', {
			imports: [SwitchComponent],
		});

		expect(container.querySelector('syn-switch')).not.toHaveClass(
			'syn-switch--label-before',
		);
	});

	it('can read the label before the track', async () => {
		const { container } = await render(
			'<syn-switch labelPosition="before">Preview</syn-switch>',
			{ imports: [SwitchComponent] },
		);

		// Only the rendered order moves: the label stays inside the <label>, so
		// clicking the text still toggles.
		expect(container.querySelector('syn-switch')).toHaveClass(
			'syn-switch--label-before',
		);
		screen.getByText('Preview').click();
		expect(screen.getByRole('switch')).toBeChecked();
	});
});
