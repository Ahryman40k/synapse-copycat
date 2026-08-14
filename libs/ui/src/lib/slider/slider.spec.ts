import { render, screen } from '@testing-library/angular';
import { SliderComponent } from './slider';

/**
 * jsdom reports 0 for every layout measurement, so the bubble clamp cannot be
 * asserted in pixels here — that is covered by the `play` functions in
 * slider.stories.ts, which run in a real browser. What is covered below: the
 * public signal API, the native input contract and the accessible name.
 */
const setup = (inputs: Record<string, unknown> = {}) =>
	render(SliderComponent, {
		inputs: { ariaLabel: 'Brightness', ...inputs },
	});

const range = () => screen.getByRole('slider') as HTMLInputElement;

describe('Slider component', () => {
	it('exposes the native range contract from its inputs', async () => {
		await setup({ min: 200, max: 3200, step: 100, value: 1600 });

		expect(range()).toHaveAttribute('min', '200');
		expect(range()).toHaveAttribute('max', '3200');
		expect(range()).toHaveAttribute('step', '100');
		expect(range().valueAsNumber).toBe(1600);
	});

	it('is reachable as a slider with an accessible name', async () => {
		await setup({ value: 40 });

		expect(screen.getByRole('slider', { name: 'Brightness' })).toBeVisible();
	});

	it('writes user input back through the value model', async () => {
		const { fixture } = await setup({ value: 10 });

		range().value = '75';
		range().dispatchEvent(new Event('input'));
		fixture.detectChanges();

		expect(fixture.componentInstance.value()).toBe(75);
	});

	it('reflects a value set from outside', async () => {
		const { fixture } = await setup({ value: 10 });

		fixture.componentInstance.value.set(90);
		fixture.detectChanges();

		expect(range().valueAsNumber).toBe(90);
	});

	it('renders the value bubble by default', async () => {
		const { fixture } = await setup({ value: 42 });

		expect(
			(fixture.nativeElement as HTMLElement).querySelector(
				'.syn-slider__bubble',
			),
		).toHaveTextContent('42');
	});

	it('omits the bubble when showBubble is false', async () => {
		const { fixture } = await setup({ value: 42, showBubble: false });

		expect(
			(fixture.nativeElement as HTMLElement).querySelector(
				'.syn-slider__bubble',
			),
		).not.toBeInTheDocument();
	});

	it('renders the min and max scale labels', async () => {
		await setup({ min: 5, max: 55 });

		expect(screen.getByText('5')).toBeVisible();
		expect(screen.getByText('55')).toBeVisible();
	});

	it('disables the native input and marks the host', async () => {
		const { fixture } = await setup({ disabled: true });

		expect(range()).toBeDisabled();
		expect(fixture.nativeElement).toHaveClass('syn-slider--disabled');
	});

	it('drives the track gradient through the fill custom property', async () => {
		const { fixture } = await setup({ min: 0, max: 200, value: 50 });

		expect(
			(fixture.nativeElement as HTMLElement).style.getPropertyValue(
				'--syn-slider-fill',
			),
		).toBe('25%');
	});

	it('clamps the fill for a value outside the range', async () => {
		const { fixture } = await setup({ min: 0, max: 100, value: 500 });

		expect(
			(fixture.nativeElement as HTMLElement).style.getPropertyValue(
				'--syn-slider-fill',
			),
		).toBe('100%');
	});

	it('does not divide by zero when min equals max', async () => {
		const { fixture } = await setup({ min: 10, max: 10, value: 10 });

		expect(
			(fixture.nativeElement as HTMLElement).style.getPropertyValue(
				'--syn-slider-fill',
			),
		).toBe('0%');
	});
});
