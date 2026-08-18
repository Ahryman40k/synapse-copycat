import { render, screen } from '@testing-library/angular';
import { BrightnessPanelComponent } from './brightness-panel';

const setup = (inputs: Record<string, unknown> = {}) =>
	render(BrightnessPanelComponent, { inputs });

const toggle = () => screen.getByRole('switch', { name: 'Brightness' });
const level = () =>
	screen.getByRole('slider', { name: 'Brightness level' }) as HTMLInputElement;

describe('BrightnessPanel', () => {
	it('starts on, at full brightness', async () => {
		await setup();

		expect(toggle()).toBeChecked();
		expect(level()).toBeEnabled();
		expect(level().valueAsNumber).toBe(100);
	});

	it('disables the level when brightness is switched off', async () => {
		const { fixture } = await setup();

		toggle().click();
		fixture.detectChanges();

		// There is no level to set when the light is off, and an enabled slider
		// would invite setting one.
		expect(level()).toBeDisabled();
		expect(fixture.componentInstance.value().activated).toBe(false);
	});

	it('enables it again when switched back on', async () => {
		const { fixture } = await setup({
			value: { activated: false, value: 40 },
		});
		expect(level()).toBeDisabled();

		toggle().click();
		fixture.detectChanges();

		expect(level()).toBeEnabled();
	});

	it('reflects a state set from outside, not just its own events', async () => {
		// The controls used to be write-only: they emitted, but never showed the
		// model, so a value set by the parent was invisible.
		const { fixture } = await setup({
			value: { activated: false, value: 25 },
		});

		expect(toggle()).not.toBeChecked();
		expect(level().valueAsNumber).toBe(25);
	});

	it('keeps the level when toggling off and on', async () => {
		const { fixture } = await setup({
			value: { activated: true, value: 60 },
		});

		toggle().click();
		fixture.detectChanges();
		toggle().click();
		fixture.detectChanges();

		expect(fixture.componentInstance.value()).toEqual({
			activated: true,
			value: 60,
		});
	});

	it('reports a level change through the model', async () => {
		const { fixture } = await setup();

		level().value = '35';
		level().dispatchEvent(new Event('input'));
		fixture.detectChanges();

		expect(fixture.componentInstance.value()).toEqual({
			activated: true,
			value: 35,
		});
	});

	it('offers to make the level the level of every device', async () => {
		const { fixture } = await setup();

		const box = screen.getByRole('checkbox', { name: 'Apply to all devices' });
		expect(box).not.toBeChecked();

		box.click();
		fixture.detectChanges();

		expect(fixture.componentInstance.applyToAll()).toBe(true);
	});
});
