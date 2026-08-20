import { Component } from '@angular/core';
import { render } from '@testing-library/angular';
import { Masonry } from './masonry';

@Component({
	selector: 'syn-masonry-host',
	imports: [Masonry],
	template: `
		<div class="grid" synMasonry>
			<div>one</div>
			<div>two</div>
			<div>three</div>
		</div>
	`,
})
class Host {}

describe('Masonry', () => {
	it('leaves the grid alone where there is nothing to measure', async () => {
		const { container } = await render(Host);

		// jsdom has no `ResizeObserver`, and reports 0 for every measurement
		// anyway. The directive stands down rather than writing spans computed
		// from zeroes — which is also what happens with scripting off, and the
		// grid then renders as an ordinary one.
		expect(typeof ResizeObserver).toBe('undefined');
		for (const item of container.querySelectorAll('.grid > div')) {
			expect((item as HTMLElement).style.gridRowEnd).toBe('');
			expect((item as HTMLElement).style.gridColumn).toBe('');
		}
	});

	it('adds nothing to the markup', async () => {
		const { container } = await render(Host);

		// An attribute directive: no wrapper, no host element of its own. The
		// packing has to be invisible to whatever is projected through it.
		expect(container.querySelectorAll('.grid > div')).toHaveLength(3);
	});
});
