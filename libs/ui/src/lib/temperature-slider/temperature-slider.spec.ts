import { render, screen } from '@testing-library/angular';
import { TemperatureSlider } from './temperature-slider';

const setup = (inputs: Record<string, unknown> = {}) =>
	render(TemperatureSlider, {
		inputs: { ariaLabel: 'White balance', ...inputs },
	});

const field = () =>
	screen.getByRole('slider', { name: 'White balance' }) as HTMLInputElement;

describe('TemperatureSlider', () => {
	it('spans the kelvin range a webcam offers', async () => {
		await setup();

		expect(field().min).toBe('2000');
		expect(field().max).toBe('7500');
		expect(field().step).toBe('100');
		expect(field().valueAsNumber).toBe(5000);
	});

	it('names the ends rather than numbering them', async () => {
		await setup();

		// A number of kelvin means nothing to most people.
		expect(screen.getByText('cool')).toBeVisible();
		expect(screen.getByText('warm')).toBeVisible();
		expect(screen.queryByText('2000')).not.toBeInTheDocument();
	});

	it('reports a change through the model', async () => {
		const { fixture } = await setup();

		field().value = '3200';
		field().dispatchEvent(new Event('input'));
		fixture.detectChanges();

		expect(fixture.componentInstance.value()).toBe(3200);
	});

	it('reflects a value set from outside', async () => {
		await setup({ value: 6800 });

		expect(field().valueAsNumber).toBe(6800);
	});

	it('passes its disabled state down to the real control', async () => {
		await setup({ disabled: true });

		expect(field()).toBeDisabled();
	});

	it('takes a range of its own when given one', async () => {
		await setup({ min: 3000, max: 6000, value: 4000 });

		expect(field().min).toBe('3000');
		expect(field().max).toBe('6000');
	});
});
