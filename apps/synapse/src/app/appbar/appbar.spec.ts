import { render, screen } from '@testing-library/angular';
import { AppBar } from './appbar';

/**
 * ⚠️ Nothing data-driven is in the bar any more.
 *
 * Devices went first: an entry per kind — `mouse (1)`, `mouse (2)` — a label
 * nobody can match to the thing on their desk, and a second route to a place
 * the dashboard already owned. Modules went with the `modules` command, which
 * Rust never registered.
 *
 * So the bar is now a fixed table plus a gear, and the tests that went with the
 * module entries — labelling by kind, numbering repeats, and the whole overflow
 * menu — went too. They are in git history if a data-driven entry returns.
 */
const setup = (inputs: Record<string, unknown> = {}) =>
	render(AppBar, { inputs });

const entry = (name: string) => screen.getByRole('button', { name });

describe('AppBar', () => {
	it('is a navigation landmark', async () => {
		await setup();

		expect(screen.getByRole('navigation', { name: 'Places' })).toBeVisible();
	});

	it('lists every fixed place', async () => {
		await setup();

		// Three places and the settings gear.
		expect(screen.getAllByRole('button')).toHaveLength(4);
		expect(entry('Synapse')).toBeVisible();
		expect(entry('Effect studio')).toBeVisible();
		expect(entry('Background manager')).toBeVisible();
	});

	describe('current entry', () => {
		it('marks home when that is where you are', async () => {
			await setup();

			// aria-current is what a screen reader announces, and what the theme
			// file selects on to recolour the label.
			expect(entry('Synapse')).toHaveAttribute('aria-current', 'page');
			expect(entry('Effect studio')).not.toHaveAttribute('aria-current');
		});

		it('marks a workspace', async () => {
			await setup({ place: 'studio' });

			expect(entry('Effect studio')).toHaveAttribute('aria-current', 'page');
			expect(entry('Synapse')).not.toHaveAttribute('aria-current');
		});

		it('marks exactly one entry at a time', async () => {
			const { fixture } = await setup({ place: 'backgrounds' });

			expect(
				(fixture.nativeElement as HTMLElement).querySelectorAll(
					'[aria-current]',
				),
			).toHaveLength(1);
		});
	});

	it('says which place was asked for', async () => {
		// One output for every fixed destination. It was three bespoke pairs and
		// every page added meant another.
		const asked: string[] = [];
		await render(AppBar, {
			on: { placeRequested: (place: string) => asked.push(place) },
		});

		entry('Effect studio').click();
		entry('Synapse').click();
		screen.getByRole('button', { name: 'Settings' }).click();

		expect(asked).toEqual(['studio', 'home', 'settings']);
	});

	it('offers the settings, at the far end', async () => {
		await setup();

		// Outside the clipped region, so it is never what scrolls away.
		const gear = screen.getByRole('button', { name: 'Settings' });
		expect(gear).toBeVisible();

		// The gear has no words of its own, so it says them on hover — and
		// matching `aria-label` keeps WCAG 2.5.3 satisfied rather than giving
		// voice control one name and the eye another.
		expect(gear).toHaveAttribute('title', 'Settings');
	});

	it('marks the gear, not Home, while the settings are open', async () => {
		// ⚠️ The gear is a place like the others and is laid out apart from
		// them, outside the clipped region, so it is never what scrolls out of
		// reach. That is the only reason it is not in the table.
		await setup({ place: 'settings' });

		expect(screen.getByRole('button', { name: 'Settings' })).toHaveAttribute(
			'aria-current',
			'page',
		);
		expect(entry('Synapse')).not.toHaveAttribute('aria-current');
	});
});
