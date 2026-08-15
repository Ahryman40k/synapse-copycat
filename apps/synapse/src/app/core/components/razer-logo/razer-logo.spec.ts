import { render, screen } from '@testing-library/angular';
import { RazerLogo } from './razer-logo';

describe('RazerLogo', () => {
	it('is announced as one image, not two shapes', async () => {
		await render(RazerLogo);

		expect(screen.getByRole('img', { name: 'Razer' })).toBeVisible();
	});

	it('exposes the two shapes the theme paints', async () => {
		const { container } = await render(RazerLogo);

		// The hardcoded #0f0 and #222 are gone; without these hooks the theme
		// file would select nothing and the mark would fall back to black.
		expect(container.querySelector('.razer-logo__disc')).toBeTruthy();
		expect(container.querySelector('.razer-logo__mark')).toBeTruthy();
	});

	it('carries no colour of its own', async () => {
		const { container } = await render(RazerLogo);

		const svg = container.querySelector('svg');
		expect(svg?.outerHTML).not.toContain('#0f0');
		expect(svg?.outerHTML).not.toContain('#222');
	});
});
