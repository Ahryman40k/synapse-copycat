import { inject, provideAppInitializer } from '@angular/core';
import {
	mockTwinkly,
	provideBackendApi,
	unusedCommands,
	withMock,
} from '@synapse-copycat/backend-api';
import { fireEvent, render, screen } from '@testing-library/angular';
import { ApplicationStore } from '../../../core/stores/application-store';
import { StripPage } from './strip-page';

const STRIP = 'twinkly-1c9dc285dd79';

const setup = () =>
	render(StripPage, {
		// The `:id` segment, as `withComponentInputBinding()` supplies it.
		inputs: { id: STRIP },
		providers: [
			provideBackendApi(
				withMock({
					...unusedCommands(),
					// The strip on the bench, as the sweep reports it.
					twinkly_devices: [
						{
							participant: STRIP,
							name: 'Twinkly_85DD79',
							address: '192.168.1.201',
							product_code: 'TWS050STQ',
							leds: 50,
							profile: 'RGB',
						},
					],
					...mockTwinkly([STRIP]),
				}),
			),
			// The dashboard route fills the store in the running application.
			provideAppInitializer(() => {
				void inject(ApplicationStore).getDiscovered();
			}),
		],
	});

describe('StripPage', () => {
	it('has a single section', async () => {
		await setup();

		const tabs = screen.getAllByRole('tab');
		expect(tabs.map((tab) => tab.textContent?.trim())).toEqual(['lighting']);
	});

	it('shows the switch and the colour, not the Razer panels', async () => {
		await setup();

		expect(screen.getByRole('heading', { name: 'Lighting' })).toBeVisible();
		expect(screen.getByRole('switch', { name: 'Lit' })).toBeVisible();
		// No effect select, no brightness: a strip is not driven by the engine.
		expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
	});

	it('asks the strip before claiming anything about it', async () => {
		const { fixture } = await setup();
		await fixture.whenStable();
		fixture.detectChanges();

		// The default is dark; checked can only have come from the read the
		// page fires on opening — the mock's strips start lit.
		expect(screen.getByRole('switch', { name: 'Lit' })).toBeChecked();
	});

	it('writes a flip of the switch through the store', async () => {
		const { fixture } = await setup();
		await fixture.whenStable();
		fixture.detectChanges();

		fireEvent.click(screen.getByRole('switch', { name: 'Lit' }));
		await fixture.whenStable();
		fixture.detectChanges();

		expect(screen.getByRole('switch', { name: 'Lit' })).not.toBeChecked();
	});
});
