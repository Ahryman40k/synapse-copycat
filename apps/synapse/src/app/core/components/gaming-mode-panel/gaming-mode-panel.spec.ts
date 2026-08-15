import { render, screen } from '@testing-library/angular';
import { GamingModePanel } from './gaming-mode-panel';

const setup = (inputs: Record<string, unknown> = {}) =>
	render(GamingModePanel, { inputs });

const toggle = () => screen.getByRole('switch', { name: 'Gaming mode' });
const box = (name: string) => screen.getByRole('checkbox', { name });

describe('GamingModePanel', () => {
	it('is titled and switched off to start with', async () => {
		await setup();

		// Uppercased by the stylesheet, so the accessible name stays readable.
		expect(screen.getByText('gaming mode')).toBeVisible();
		expect(toggle()).not.toBeChecked();
	});

	it('lists the four shortcuts it can suppress', async () => {
		await setup();

		const labels = screen
			.getAllByRole('checkbox')
			.map((input) => input.closest('label')?.textContent?.trim());

		expect(labels).toEqual([
			'Apply In-game only',
			'Disable Windows key',
			'Disable Menu key',
			'Disable ALT + Tab',
			'Disable ALT + F4',
		]);
	});

	it('groups the four under their caption', async () => {
		await setup();

		// The caption names the group rather than being repeated on each box.
		const group = screen.getByRole('group', {
			name: 'When gaming mode is On:',
		});
		expect(group).toBeVisible();
	});

	it('disables every option while gaming mode is off', async () => {
		await setup();

		// There is nothing to configure when the mode is off, and an enabled box
		// would invite configuring it.
		for (const input of screen.getAllByRole('checkbox')) {
			expect(input).toBeDisabled();
		}
	});

	it('enables them once switched on', async () => {
		const { fixture } = await setup();

		toggle().click();
		fixture.detectChanges();

		expect(fixture.componentInstance.value().activated).toBe(true);
		for (const input of screen.getAllByRole('checkbox')) {
			expect(input).toBeEnabled();
		}
	});

	it('reflects a state set from outside, not just its own events', async () => {
		await setup({
			value: {
				activated: true,
				inGameOnly: true,
				disableWindowsKey: false,
				disableMenuKey: false,
				disableAltTab: true,
				disableAltF4: false,
			},
		});

		expect(toggle()).toBeChecked();
		expect(box('Apply In-game only')).toBeChecked();
		expect(box('Disable ALT + Tab')).toBeChecked();
		expect(box('Disable Windows key')).not.toBeChecked();
	});

	it('reports a single option through the model, leaving the rest alone', async () => {
		const { fixture } = await setup({
			value: {
				activated: true,
				inGameOnly: false,
				disableWindowsKey: true,
				disableMenuKey: false,
				disableAltTab: false,
				disableAltF4: false,
			},
		});

		box('Disable ALT + F4').click();
		fixture.detectChanges();

		expect(fixture.componentInstance.value()).toEqual({
			activated: true,
			inGameOnly: false,
			disableWindowsKey: true,
			disableMenuKey: false,
			disableAltTab: false,
			disableAltF4: true,
		});
	});
});
