import type { Device, Module } from '@synapse-copycat/backend-api';
import { render, screen } from '@testing-library/angular';
import { AppBar } from './appbar';

const DEVICES: Device[] = [
	{
		__type: 'device',
		kind: 'mouse',
		name: 'Razer Basilisk Ultimate',
		id: '5426-0136',
		visual: 'assets/devices/5426-0136.png',
	},
	{
		__type: 'device',
		kind: 'mousemat',
		name: 'Razer Goliathus',
		id: '5426-3074',
		visual: 'assets/devices/5426-3074.png',
	},
];

const TWO_MICE: Device[] = [
	DEVICES[0],
	{
		__type: 'device',
		kind: 'mouse',
		name: 'Razer Viper V2 Pro',
		id: '5426-0165',
		visual: 'assets/devices/5426-0165.png',
	},
];

const MODULES: Module[] = [
	{
		__type: 'module',
		kind: 'twinkly',
		name: 'Twinkly',
		visual: 'assets/modules/twinkly.png',
	},
];

const setup = (inputs: Record<string, unknown> = {}) =>
	render(AppBar, {
		inputs: { devices: DEVICES, modules: MODULES, ...inputs },
	});

const entry = (name: string) => screen.getByRole('button', { name });

describe('AppBar', () => {
	it('is a navigation landmark', async () => {
		await setup();

		expect(
			screen.getByRole('navigation', { name: 'Devices and modules' }),
		).toBeVisible();
	});

	it('lists home, every device and every module', async () => {
		await setup();

		// Home, three entries, and the settings gear, which is not an entry.
		expect(screen.getAllByRole('button')).toHaveLength(5);
		expect(entry('Synapse')).toBeVisible();
		// Labelled by kind — short enough for a narrow window — with the full
		// name carried by the title.
		expect(entry('mouse')).toBeVisible();
		expect(entry('mousemat')).toBeVisible();
		expect(entry('twinkly')).toBeVisible();
	});

	describe('current entry', () => {
		it('marks home when no entry is active', async () => {
			await setup();

			// aria-current is what a screen reader announces, and what the theme
			// file selects on to recolour the label.
			expect(entry('Synapse')).toHaveAttribute('aria-current', 'page');
			expect(entry('mouse')).not.toHaveAttribute('aria-current');
		});

		it('marks the matching device by id, not by kind', async () => {
			await setup({ activeId: '5426-3074' });

			expect(entry('mousemat')).toHaveAttribute('aria-current', 'page');
			expect(entry('Synapse')).not.toHaveAttribute('aria-current');
			expect(entry('mouse')).not.toHaveAttribute('aria-current');
		});

		it('marks the matching module', async () => {
			await setup({ activeId: 'twinkly' });

			expect(entry('twinkly')).toHaveAttribute('aria-current', 'page');
		});

		it('marks one entry only when two devices share a kind', async () => {
			// Two mice of different models: keying on `kind` would light up both.
			const { fixture } = await setup({
				devices: TWO_MICE,
				activeId: '5426-0165',
			});

			expect(entry('mouse (2)')).toHaveAttribute('aria-current', 'page');
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
				inputs: { devices: DEVICES, modules: MODULES },
				on: { homeRequested: () => asked++ },
			});

			entry('Synapse').click();

			expect(asked).toBe(1);
		});

		it('emits the activated device, not just its kind', async () => {
			const seen: Device[] = [];
			await render(AppBar, {
				inputs: { devices: DEVICES, modules: MODULES },
				on: { deviceActivated: (device: Device) => seen.push(device) },
			});

			entry('mousemat').click();

			expect(seen).toEqual([DEVICES[1]]);
		});

		it('emits the activated module', async () => {
			const seen: Module[] = [];
			await render(AppBar, {
				inputs: { devices: DEVICES, modules: MODULES },
				on: { moduleActivated: (module: Module) => seen.push(module) },
			});

			entry('twinkly').click();

			expect(seen).toEqual([MODULES[0]]);
		});
	});

	describe('labels', () => {
		it('uses the bare kind when it is the only one', async () => {
			await setup();

			expect(entry('mouse')).toBeVisible();
			expect(screen.queryByRole('button', { name: 'mouse (1)' })).toBeNull();
		});

		it('numbers them once a kind repeats', async () => {
			await setup({ devices: TWO_MICE });

			expect(entry('mouse (1)')).toBeVisible();
			expect(entry('mouse (2)')).toBeVisible();
			expect(screen.queryByRole('button', { name: 'mouse' })).toBeNull();
		});

		it('numbers only the kind that repeats', async () => {
			await setup({ devices: [...TWO_MICE, DEVICES[1]] });

			expect(entry('mouse (1)')).toBeVisible();
			expect(entry('mouse (2)')).toBeVisible();
			expect(entry('mousemat')).toBeVisible();
		});

		it('keeps the full name reachable as the title', async () => {
			await setup({ devices: TWO_MICE });

			// Not as an aria-label: WCAG 2.5.3 wants the accessible name to
			// contain the visible text.
			expect(entry('mouse (2)')).toHaveAttribute('title', 'Razer Viper V2 Pro');
			expect(entry('mouse (2)')).not.toHaveAttribute('aria-label');
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

			fixture.componentInstance.overflowing.set(new Set(['5426-3074']));
			fixture.detectChanges();

			expect(screen.getByRole('button', { name: '1 more' })).toBeVisible();
		});

		it('takes a clipped entry out of the tab order', async () => {
			const { fixture } = await setup();

			fixture.componentInstance.overflowing.set(new Set(['5426-3074']));
			fixture.detectChanges();

			// [hidden] removes it from the accessibility tree; the stylesheet
			// keeps its box so the layout does not change.
			expect(screen.queryByRole('button', { name: 'mousemat' })).toBeNull();
		});

		it('lists the clipped entries in the menu', async () => {
			const { fixture } = await setup();
			fixture.componentInstance.overflowing.set(
				new Set(['5426-3074', 'twinkly']),
			);
			fixture.detectChanges();

			screen.getByRole('button', { name: '2 more' }).click();
			fixture.detectChanges();

			expect(screen.getByRole('menu')).toBeVisible();
			expect(screen.getAllByRole('menuitem')).toHaveLength(2);
			expect(screen.getByRole('menuitem', { name: 'mousemat' })).toBeVisible();
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
			const seen: Device[] = [];
			const { fixture } = await render(AppBar, {
				inputs: { devices: DEVICES, modules: MODULES },
				on: { deviceActivated: (device: Device) => seen.push(device) },
			});
			fixture.componentInstance.overflowing.set(new Set(['5426-3074']));
			fixture.detectChanges();

			screen.getByRole('button', { name: '1 more' }).click();
			fixture.detectChanges();
			screen.getByRole('menuitem', { name: 'mousemat' }).click();
			fixture.detectChanges();

			expect(seen).toEqual([DEVICES[1]]);
			expect(screen.queryByRole('menu')).toBeNull();
		});

		it('marks the current entry inside the menu too', async () => {
			const { fixture } = await setup({ activeId: '5426-3074' });
			fixture.componentInstance.overflowing.set(new Set(['5426-3074']));
			fixture.detectChanges();

			screen.getByRole('button', { name: '1 more' }).click();
			fixture.detectChanges();

			expect(
				screen.getByRole('menuitem', { name: 'mousemat' }),
			).toHaveAttribute('aria-current', 'page');
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
		await setup({ devices: [], modules: [] });

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

		// `activeId` only names devices and modules, so without this Home would
		// light up over a page that is not it.
		expect(screen.getByRole('button', { name: 'Settings' })).toHaveAttribute(
			'aria-current',
			'page',
		);
		expect(entry('Synapse')).not.toHaveAttribute('aria-current');
	});
});
