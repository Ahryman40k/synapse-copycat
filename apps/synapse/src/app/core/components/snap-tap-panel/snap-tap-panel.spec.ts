import { render, screen } from '@testing-library/angular';
import { SnapTapPanel } from './snap-tap-panel';

const toggle = () => screen.getByRole('switch', { name: 'Snap Tap' });

describe('SnapTapPanel', () => {
	it('is titled and off to start with', async () => {
		await render(SnapTapPanel);

		// Uppercased by the stylesheet, so the accessible name stays readable.
		expect(screen.getByText('snap tap')).toBeVisible();
		expect(toggle()).not.toBeChecked();
	});

	it('reflects a state set from outside', async () => {
		await render(SnapTapPanel, { inputs: { activated: true } });

		expect(toggle()).toBeChecked();
	});

	it('reports a switch through the model', async () => {
		const { fixture } = await render(SnapTapPanel);

		toggle().click();
		fixture.detectChanges();

		expect(fixture.componentInstance.activated()).toBe(true);
	});
});
