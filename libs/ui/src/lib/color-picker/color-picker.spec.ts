import { render, screen } from '@testing-library/angular';
import { ColorPicker } from './color-picker';

const setup = (inputs: Record<string, unknown> = {}) =>
	render(ColorPicker, { inputs: { ariaLabel: 'Colour', ...inputs } });

const swatch = () =>
	screen.getByLabelText('Colour', { selector: 'input' }) as HTMLInputElement;

describe('ColorPicker', () => {
	it('is a native colour input, not a div pretending', async () => {
		await setup();

		// The platform picker, the eyedropper and the keyboard all come from the
		// element being real. A styled div would have to reimplement the lot.
		expect(swatch().type).toBe('color');
	});

	it('shows the colour it is given', async () => {
		await setup({ value: '#48c242' });

		expect(swatch()).toHaveValue('#48c242');
	});

	it('writes a pick back into the model', async () => {
		const { fixture } = await setup({ value: '#000000' });

		swatch().value = '#ff0000';
		swatch().dispatchEvent(new Event('input'));

		expect(fixture.componentInstance.value()).toBe('#ff0000');
	});

	it('marks itself empty when no colour is chosen', async () => {
		const { fixture } = await setup();

		// `undefined` is *no colour*, which the native input cannot hold — it
		// reports black. The class is what lets the chequerboard show instead.
		expect(fixture.nativeElement).toHaveClass('syn-color-picker--empty');
		expect(swatch()).toHaveValue('#000000');
		expect(screen.getByText('None')).toBeInTheDocument();
	});

	it('offers no way back to empty unless asked', async () => {
		await setup({ value: '#48c242' });

		expect(
			screen.queryByRole('button', { name: 'Clear' }),
		).not.toBeInTheDocument();
	});

	it('returns to empty when cleared', async () => {
		const { fixture } = await setup({ value: '#48c242', clearable: true });

		screen.getByRole('button', { name: 'Clear' }).click();
		fixture.detectChanges();

		expect(fixture.componentInstance.value()).toBeUndefined();
		expect(fixture.nativeElement).toHaveClass('syn-color-picker--empty');
	});

	it('hides the clear button while already empty', async () => {
		await setup({ clearable: true });

		expect(
			screen.queryByRole('button', { name: 'Clear' }),
		).not.toBeInTheDocument();
	});

	it('disables the input and marks the host', async () => {
		const { fixture } = await setup({ value: '#48c242', disabled: true });

		expect(swatch()).toBeDisabled();
		expect(fixture.nativeElement).toHaveClass('syn-color-picker--disabled');
	});

	it('takes its accessible name from a projected label', async () => {
		await render(
			'<syn-color-picker [value]="value">Static colour</syn-color-picker>',
			{ imports: [ColorPicker], componentProperties: { value: '#48c242' } },
		);

		expect(screen.getByLabelText('Static colour')).toHaveValue('#48c242');
	});
});
