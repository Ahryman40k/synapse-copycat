import { render, screen } from '@testing-library/angular';
import { WirelessPowerSavingPanel } from './wireless-power-saving-panel';

const setup = (inputs: Record<string, unknown> = {}) =>
	render(WirelessPowerSavingPanel, { inputs });

const slider = () =>
	screen.getByRole('slider', {
		name: 'Idle minutes before sleep',
	}) as HTMLInputElement;

describe('WirelessPowerSavingPanel', () => {
	it('is titled and says what the number means', async () => {
		await setup();

		// Uppercased by the stylesheet, so the accessible name stays readable.
		expect(
			screen.getByRole('heading', { name: 'Wireless power saving' }),
		).toBeVisible();
		expect(
			screen.getByText('Enter sleep mode if idle for (minutes)'),
		).toBeVisible();
	});

	it('runs from 1 to 15 minutes, starting at 5', async () => {
		await setup();

		// Not 0: "sleep after no idle time" has no meaning, and the control
		// would offer a setting that cannot do anything.
		expect(slider().min).toBe('1');
		expect(slider().max).toBe('15');
		expect(slider().valueAsNumber).toBe(5);
	});

	it('reflects a value set from outside', async () => {
		await setup({ sleepAfter: 12 });

		expect(slider().valueAsNumber).toBe(12);
	});

	it('reports a change through the model', async () => {
		const { fixture } = await setup();

		slider().value = '9';
		slider().dispatchEvent(new Event('input'));
		fixture.detectChanges();

		expect(fixture.componentInstance.sleepAfter()).toBe(9);
	});
});
