import { render, screen } from '@testing-library/angular';
import { LowPowerModePanel } from './low-power-mode-panel';

const setup = (inputs: Record<string, unknown> = {}) =>
	render(LowPowerModePanel, { inputs });

const slider = () =>
	screen.getByRole('slider', {
		name: 'Battery percentage before low power mode',
	}) as HTMLInputElement;

describe('LowPowerModePanel', () => {
	it('is titled and says what the number means', async () => {
		await setup();

		expect(
			screen.getByRole('heading', { name: 'Low power mode' }),
		).toBeVisible();
		expect(
			screen.getByText(
				'When wireless, enter Low Power Mode if the battery level is below (%)',
			),
		).toBeVisible();
	});

	it('runs from 5 to 100 per cent, starting at 30', async () => {
		await setup();

		// Not 0: a threshold of nothing would never be crossed, so the mode
		// could never turn on.
		expect(slider().min).toBe('5');
		expect(slider().max).toBe('100');
		expect(slider().valueAsNumber).toBe(30);
	});

	it('reflects a value set from outside', async () => {
		await setup({ threshold: 75 });

		expect(slider().valueAsNumber).toBe(75);
	});

	it('reports a change through the model', async () => {
		const { fixture } = await setup();

		slider().value = '45';
		slider().dispatchEvent(new Event('input'));
		fixture.detectChanges();

		expect(fixture.componentInstance.threshold()).toBe(45);
	});
});
