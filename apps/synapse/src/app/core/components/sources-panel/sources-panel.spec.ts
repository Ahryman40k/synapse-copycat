import { render, screen } from '@testing-library/angular';
import { SOURCES_DEFAULT } from '../../models/source';
import { SourcesPanel } from './sources-panel';

const setup = (inputs: Record<string, unknown> = {}) =>
	render(SourcesPanel, { inputs: { sources: SOURCES_DEFAULT, ...inputs } });

const control = (name: string) => screen.getByRole('switch', { name });

describe('SourcesPanel', () => {
	it('offers one switch per protocol', async () => {
		await setup();

		expect(control('Look for Razer Chroma')).toBeVisible();
		expect(control('Look for Twinkly')).toBeVisible();
		expect(control('Look for Govee')).toBeVisible();
	});

	it('reflects what is switched on', async () => {
		await setup({ sources: { chroma: true, twinkly: false, govee: false } });

		expect(control('Look for Razer Chroma')).toBeChecked();
		expect(control('Look for Twinkly')).not.toBeChecked();
	});

	it('shows a protocol with nothing behind it, disabled', async () => {
		// ⚠️ Shown rather than hidden, and disabled rather than working. A
		// switch that turns on something that does not exist is worse than one
		// that says so; hiding it makes the plan invisible.
		await setup();

		expect(control('Look for Govee')).toBeDisabled();
		expect(screen.getByText('Not implemented yet.')).toBeVisible();
	});

	it('says which protocol was switched, and to what', async () => {
		const changes: unknown[] = [];
		const { fixture } = await setup();
		fixture.componentInstance.sourceChange.subscribe((change) =>
			changes.push(change),
		);

		control('Look for Twinkly').click();

		expect(changes).toEqual([{ source: 'twinkly', enabled: false }]);
	});

	it('says what each one costs', async () => {
		// The reason to turn one off is the cost, so the cost is on the row —
		// a sweep of the whole subnet is a fair thing to refuse.
		await setup();

		expect(
			screen.getByText('Light strings found by sweeping the local network.'),
		).toBeVisible();
	});
});
