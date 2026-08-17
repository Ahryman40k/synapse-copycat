import { render, screen } from '@testing-library/angular';
import { PollingRatePanel } from './polling-rate-panel';

const setup = (inputs: Record<string, unknown> = {}) =>
	render(PollingRatePanel, { inputs });

const rate = (hz: number) =>
	screen.getByRole('radio', { name: `${hz} Hz` }) as HTMLInputElement;

describe('PollingRatePanel', () => {
	it('is titled and says what the number means', async () => {
		await setup();

		expect(screen.getByRole('heading', { name: 'Polling rate' })).toBeVisible();
		expect(
			screen.getByText('The frequency (Hz) of data updates in a second'),
		).toBeVisible();
	});

	it('offers the three rates as one named group', async () => {
		await setup();

		// A radio group, not a row of buttons: one of three is exactly what
		// radios are for. See `syn-button-group`.
		expect(
			screen.getByRole('radiogroup', { name: 'Polling rate' }),
		).toBeVisible();
		expect(
			screen
				.getAllByRole('radio')
				.map((r) => r.closest('label')?.textContent?.trim()),
		).toEqual(['125 Hz', '500 Hz', '1000 Hz']);
	});

	it('starts at the fastest', async () => {
		await setup();

		expect(rate(1000)).toBeChecked();
		expect(rate(125)).not.toBeChecked();
	});

	it('reflects a rate set from outside', async () => {
		await setup({ rate: 500 });

		expect(rate(500)).toBeChecked();
	});

	it('reports a choice through the model, as a number', async () => {
		const { fixture } = await setup();

		rate(125).click();
		fixture.detectChanges();

		// The group speaks in strings; the panel is what turns it back.
		expect(fixture.componentInstance.rate()).toBe(125);
	});
});
