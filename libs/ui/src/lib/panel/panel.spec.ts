import { Component } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import { Panel } from './panel';

@Component({
	imports: [Panel],
	template: `
		<syn-panel>
			<h2>Switch off lighting</h2>
			<button type="button">Apply</button>
		</syn-panel>
	`,
})
class Host {}

describe('Panel', () => {
	it('projects its content', async () => {
		await render(Host);

		expect(
			screen.getByRole('heading', { name: 'Switch off lighting' }),
		).toBeVisible();
		expect(screen.getByRole('button', { name: 'Apply' })).toBeVisible();
	});

	it('is not interactive itself', async () => {
		const { fixture } = await render(Host);
		const panel = (fixture.nativeElement as HTMLElement).querySelector(
			'syn-panel',
		);

		// The controls inside react; the container does not. A panel that
		// announces itself as clickable is the bug this split fixes.
		expect(panel).not.toHaveAttribute('role');
		expect(panel).not.toHaveAttribute('tabindex');
	});

	it('leaves the controls inside reachable', async () => {
		await render(Host);

		screen.getByRole('button', { name: 'Apply' }).focus();

		expect(screen.getByRole('button', { name: 'Apply' })).toHaveFocus();
	});
});
