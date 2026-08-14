import { render, screen } from '@testing-library/angular';
import { CheckboxComponent } from './checkbox';

/**
 * Almost everything asserted here is native behaviour the previous
 * implementation had removed by hiding the input with `display: none`.
 */
const setup = (inputs: Record<string, unknown> = {}) =>
	render(CheckboxComponent, {
		inputs,
		// Projected label — how the application uses it.
		componentProperties: {},
	});

const box = () => screen.getByRole('checkbox') as HTMLInputElement;

describe('Checkbox', () => {
	it('exposes a real checkbox to assistive technology', async () => {
		await setup({ ariaLabel: 'When display is turned off' });

		expect(
			screen.getByRole('checkbox', { name: 'When display is turned off' }),
		).toBeVisible();
	});

	it('is in the tab order and focusable', async () => {
		await setup({ ariaLabel: 'Enabled' });

		box().focus();

		expect(box()).toHaveFocus();
		// `display: none` would have made this impossible — the regression this
		// component was rebuilt to fix.
		expect(box()).not.toHaveAttribute('tabindex', '-1');
	});

	it('starts unchecked and reflects the model', async () => {
		const { fixture } = await setup({ ariaLabel: 'Enabled' });
		expect(box().checked).toBe(false);

		fixture.componentInstance.checked.set(true);
		fixture.detectChanges();

		expect(box().checked).toBe(true);
	});

	it('writes a user toggle back into the model', async () => {
		const { fixture } = await setup({ ariaLabel: 'Enabled' });

		box().click();
		fixture.detectChanges();

		expect(fixture.componentInstance.checked()).toBe(true);
	});

	it('toggles back on a second click', async () => {
		const { fixture } = await setup({ ariaLabel: 'Enabled', checked: true });

		box().click();
		fixture.detectChanges();

		expect(fixture.componentInstance.checked()).toBe(false);
	});

	it('supports the indeterminate state', async () => {
		await setup({ ariaLabel: 'Select all', indeterminate: true });

		expect(box().indeterminate).toBe(true);
	});

	it('disables the native input and marks the host', async () => {
		const { fixture } = await setup({ ariaLabel: 'Enabled', disabled: true });

		expect(box()).toBeDisabled();
		expect(fixture.nativeElement).toHaveClass('syn-checkbox--disabled');
	});

	it('does not change when disabled', async () => {
		const { fixture } = await setup({ ariaLabel: 'Enabled', disabled: true });

		box().click();
		fixture.detectChanges();

		expect(fixture.componentInstance.checked()).toBe(false);
	});

	it('associates the projected label with the input', async () => {
		const { fixture } = await render(
			'<syn-checkbox>When display is turned off</syn-checkbox>',
			{ imports: [CheckboxComponent] },
		);

		// Clicking the text toggles, because the input sits inside a <label>.
		const label = fixture.nativeElement.querySelector('.syn-checkbox__label');
		expect(label?.textContent).toContain('When display is turned off');

		(label as HTMLElement).click();
		fixture.detectChanges();

		expect(box().checked).toBe(true);
	});
});
