import type { Module } from '@synapse-copycat/backend-api';
import { render, screen } from '@testing-library/angular';
import { AppBar } from './appbar';

/**
 * ⚠️ Devices are not in the bar any more, so nothing here mentions one. They
 * were an entry per kind — `mouse (1)`, `mouse (2)` — a label nobody can match
 * to the thing on their desk, and a second route to a place the dashboard
 * already owned. A device is opened from its own tile now.
 */
const MODULES: Module[] = [
	{
		__type: 'module',
		kind: 'twinkly',
		name: 'Twinkly',
		visual: 'assets/modules/twinkly.png',
	},
	{
		__type: 'module',
		kind: 'goove',
		name: 'Goove',
		visual: 'assets/modules/goove.png',
	},
];

const TWO_OF_A_KIND: Module[] = [
	MODULES[0],
	{
		__type: 'module',
		kind: 'twinkly',
		name: 'Twinkly, the other one',
		visual: 'assets/modules/twinkly.png',
	},
];

const setup = (inputs: Record<string, unknown> = {}) =>
	render(AppBar, { inputs: { modules: MODULES, ...inputs } });

const entry = (name: string) => screen.getByRole('button', { name });

describe('AppBar', () => {
	it('is a navigation landmark', async () => {
		await setup();

		expect(screen.getByRole('navigation', { name: 'Modules' })).toBeVisible();
	});

	it('lists home and every module', async () => {
		await setup();

		// Home, two modules, and the settings gear, which is not an entry.
		expect(screen.getAllByRole('button')).toHaveLength(4);
		expect(entry('Synapse')).toBeVisible();
		expect(entry('twinkly')).toBeVisible();
		expect(entry('goove')).toBeVisible();
	});

	describe('current entry', () => {
		it('marks home when no entry is active', async () => {
			await setup();

			// aria-current is what a screen reader announces, and what the theme
			// file selects on to recolour the label.
			expect(entry('Synapse')).toHaveAttribute('aria-current', 'page');
			expect(entry('twinkly')).not.toHaveAttribute('aria-current');
		});

		it('marks the matching module', async () => {
			const { fixture } = await setup({ activeId: 'twinkly' });

			expect(entry('twinkly')).toHaveAttribute('aria-current', 'page');
			expect(entry('Synapse')).not.toHaveAttribute('aria-current');
			expect(
				(fixture.nativeElement as HTMLElement).querySelectorAll(
					'[aria-current]',
				),
			).toHaveLength(1);
		});
	});

	describe('outputs', () => {
		it('asks for home', async () => {
			let asked = 0;
			await render(AppBar, {
				inputs: { modules: MODULES },
				on: { homeRequested: () => asked++ },
			});

			entry('Synapse').click();

			expect(asked).toBe(1);
		});

		it('emits the activated module, not just its kind', async () => {
			const seen: Module[] = [];
			await render(AppBar, {
				inputs: { modules: MODULES },
				on: { moduleActivated: (module: Module) => seen.push(module) },
			});

			entry('goove').click();

			expect(seen).toEqual([MODULES[1]]);
		});
	});

	describe('labels', () => {
		it('uses the bare kind when it is the only one', async () => {
			await setup();

			expect(entry('twinkly')).toBeVisible();
			expect(screen.queryByRole('button', { name: 'twinkly (1)' })).toBeNull();
		});

		it('numbers them once a kind repeats', async () => {
			// ⚠️ Two of a kind are told apart in the label but not in `activeId`,
			// which is a module's `kind` — both would be marked current. Modules
			// have no id of their own yet; see the bar's `activeId`.
			await setup({ modules: TWO_OF_A_KIND });

			expect(entry('twinkly (1)')).toBeVisible();
			expect(entry('twinkly (2)')).toBeVisible();
			expect(screen.queryByRole('button', { name: 'twinkly' })).toBeNull();
		});

		it('keeps the full name reachable as the title', async () => {
			await setup();

			// Not as an aria-label: WCAG 2.5.3 wants the accessible name to
			// contain the visible text.
			expect(entry('twinkly')).toHaveAttribute('title', 'Twinkly');
			expect(entry('twinkly')).not.toHaveAttribute('aria-label');
		});
	});

	describe('overflow menu', () => {
		// jsdom has no IntersectionObserver and no layout, so the clipped set is
		// driven directly. What is asserted is the behaviour that follows from
		// it; which entries actually clip is only observable in a browser, hence
		// the `Narrower than its contents` story.

		it('shows no trigger while everything fits', async () => {
			await setup();

			expect(screen.queryByRole('button', { name: /more$/ })).toBeNull();
		});

		it('offers a trigger once entries are clipped', async () => {
			const { fixture } = await setup();

			fixture.componentInstance.overflowing.set(new Set(['goove']));
			fixture.detectChanges();

			expect(screen.getByRole('button', { name: '1 more' })).toBeVisible();
		});

		it('takes a clipped entry out of the tab order', async () => {
			const { fixture } = await setup();

			fixture.componentInstance.overflowing.set(new Set(['goove']));
			fixture.detectChanges();

			// [hidden] removes it from the accessibility tree; the stylesheet
			// keeps its box so the layout does not change.
			expect(screen.queryByRole('button', { name: 'goove' })).toBeNull();
		});

		it('lists the clipped entries in the menu', async () => {
			const { fixture } = await setup();
			fixture.componentInstance.overflowing.set(new Set(['goove', 'twinkly']));
			fixture.detectChanges();

			screen.getByRole('button', { name: '2 more' }).click();
			fixture.detectChanges();

			expect(screen.getByRole('menu')).toBeVisible();
			expect(screen.getAllByRole('menuitem')).toHaveLength(2);
			expect(screen.getByRole('menuitem', { name: 'goove' })).toBeVisible();
		});

		it('reports its expanded state', async () => {
			const { fixture } = await setup();
			fixture.componentInstance.overflowing.set(new Set(['twinkly']));
			fixture.detectChanges();

			const trigger = screen.getByRole('button', { name: '1 more' });
			expect(trigger).toHaveAttribute('aria-expanded', 'false');

			trigger.click();
			fixture.detectChanges();
			expect(trigger).toHaveAttribute('aria-expanded', 'true');
		});

		it('activates from the menu and closes it', async () => {
			const seen: Module[] = [];
			const { fixture } = await render(AppBar, {
				inputs: { modules: MODULES },
				on: { moduleActivated: (module: Module) => seen.push(module) },
			});
			fixture.componentInstance.overflowing.set(new Set(['goove']));
			fixture.detectChanges();

			screen.getByRole('button', { name: '1 more' }).click();
			fixture.detectChanges();
			screen.getByRole('menuitem', { name: 'goove' }).click();
			fixture.detectChanges();

			expect(seen).toEqual([MODULES[1]]);
			expect(screen.queryByRole('menu')).toBeNull();
		});

		it('marks the current entry inside the menu too', async () => {
			const { fixture } = await setup({ activeId: 'goove' });
			fixture.componentInstance.overflowing.set(new Set(['goove']));
			fixture.detectChanges();

			screen.getByRole('button', { name: '1 more' }).click();
			fixture.detectChanges();

			expect(screen.getByRole('menuitem', { name: 'goove' })).toHaveAttribute(
				'aria-current',
				'page',
			);
		});

		it('closes on Escape', async () => {
			const { fixture } = await setup();
			fixture.componentInstance.overflowing.set(new Set(['twinkly']));
			fixture.detectChanges();

			screen.getByRole('button', { name: '1 more' }).click();
			fixture.detectChanges();
			expect(screen.getByRole('menu')).toBeVisible();

			(fixture.nativeElement as HTMLElement).dispatchEvent(
				new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
			);
			fixture.detectChanges();

			expect(screen.queryByRole('menu')).toBeNull();
		});
	});

	it('renders with nothing connected', async () => {
		await setup({ modules: [] });

		// Home and the settings gear; the gear is there whether or not anything
		// is plugged in.
		expect(screen.getAllByRole('button')).toHaveLength(2);
		expect(entry('Synapse')).toHaveAttribute('aria-current', 'page');
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

	it('asks for the settings when the gear is pressed', async () => {
		const settingsRequested = vi.fn();
		const { fixture } = await setup();
		fixture.componentInstance.settingsRequested.subscribe(settingsRequested);

		screen.getByRole('button', { name: 'Settings' }).click();

		expect(settingsRequested).toHaveBeenCalled();
	});

	it('marks the gear, not Home, while the settings are open', async () => {
		await setup({ settingsActive: true });

		// `activeId` only names modules, so without this Home would light up
		// over a page that is not it.
		expect(screen.getByRole('button', { name: 'Settings' })).toHaveAttribute(
			'aria-current',
			'page',
		);
		expect(entry('Synapse')).not.toHaveAttribute('aria-current');
	});
});
