import { render, screen } from '@testing-library/angular';
import { CHROMA_EFFECTS } from '../../models/chroma-effect';
import { EffectsPanel } from './effects-panel';

const setup = (inputs: Record<string, unknown> = {}) =>
	render(EffectsPanel, { inputs });

const select = () =>
	screen.getByRole('combobox', {
		name: 'Lighting effect',
	}) as HTMLSelectElement;

describe('EffectsPanel', () => {
	it('is titled', async () => {
		await setup();

		// Uppercased by the stylesheet, so the accessible name stays "Effects".
		expect(screen.getByRole('heading', { name: 'Effects' })).toBeVisible();
	});

	it('offers only the effects the backend implements', async () => {
		await setup();

		const labels = screen
			.getAllByRole('option')
			.map((o) => o.textContent?.trim());
		expect(labels).toEqual(['Static', 'Spectrum', 'Wave', 'Breathe']);
	});

	it('does not offer effects with no capability behind them', async () => {
		await setup();

		// `reactive` exists in OpenRazer but has no Rust capability yet, and
		// `dynamic` is not a chroma effect at all. Offering either would be a
		// control that cannot work.
		const values = CHROMA_EFFECTS.map((option) => option.value);
		expect(values).not.toContain('reactive');
		expect(values).not.toContain('dynamic');

		// `none` is the other kind of absence: the backend does implement it,
		// and it is left out anyway. It puts the lighting out, which the
		// brightness switch already does — and does better, since brightness
		// brings the effect back and `setNone` has nothing to return to.
		expect(values).not.toContain('none');
	});

	it('starts on spectrum', async () => {
		await setup();

		expect(select().value).toBe('spectrum');
	});

	it('reflects an effect set from outside', async () => {
		await setup({ effect: 'wave' });

		expect(select().value).toBe('wave');
	});

	it('writes a chosen effect back into the model', async () => {
		const { fixture } = await setup();

		select().value = 'static';
		select().dispatchEvent(new Event('change'));
		fixture.detectChanges();

		expect(fixture.componentInstance.effect()).toBe('static');
	});

	it('offers to make the choice for every device at once', async () => {
		const { fixture } = await setup();

		const box = screen.getByRole('checkbox', { name: 'Apply to all devices' });
		expect(box).not.toBeChecked();

		box.click();
		fixture.detectChanges();

		// A mode, not an action: the panel only says what was asked, and the
		// store is what holds it for every panel on every page.
		expect(fixture.componentInstance.applyToAll()).toBe(true);
	});

	it('shows the mode as already on when the store says so', async () => {
		await setup({ applyToAll: true });

		expect(
			screen.getByRole('checkbox', { name: 'Apply to all devices' }),
		).toBeChecked();
	});

	// ── what each effect asks for ────────────────────────────────────────────

	it('shows no further control for spectrum', async () => {
		await setup({ effect: 'spectrum' });

		// Complete as chosen — the device decides the rest. A panel of
		// controls that do nothing would be worse than an empty one.
		expect(screen.queryByLabelText('Colour')).not.toBeInTheDocument();
		expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
		expect(
			screen.queryByRole('checkbox', { name: 'Random' }),
		).not.toBeInTheDocument();
	});

	it('asks for one colour on static', async () => {
		await setup({ effect: 'static' });

		expect(screen.getByLabelText('Colour')).toHaveValue('#00ff00');
		expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
	});

	it('writes a chosen colour into the settings', async () => {
		const { fixture } = await setup({ effect: 'static' });

		const picker = screen.getByLabelText('Colour') as HTMLInputElement;
		picker.value = '#ff0000';
		picker.dispatchEvent(new Event('input'));

		expect(fixture.componentInstance.settings().color).toBe('#ff0000');
	});

	it('asks for a direction on wave', async () => {
		await setup({ effect: 'wave' });

		const group = screen.getByRole('radiogroup', { name: 'Wave direction' });
		expect(group).toBeVisible();
		// Drawn as arrows, so the name has to come from the radio itself.
		expect(screen.getByRole('radio', { name: 'Upwards' })).toBeChecked();
		expect(screen.getByRole('radio', { name: 'Downwards' })).not.toBeChecked();
	});

	it('writes a chosen direction into the settings', async () => {
		const { fixture } = await setup({ effect: 'wave' });

		screen.getByRole('radio', { name: 'Downwards' }).click();
		fixture.detectChanges();

		expect(fixture.componentInstance.settings().direction).toBe('reverse');
	});

	it.each([
		['vertical', 'Upwards', 'Downwards'],
		['horizontal', 'Leftwards', 'Rightwards'],
		['rotary', 'Anticlockwise', 'Clockwise'],
	])('draws the %s pair of arrows', async (orientation, first, second) => {
		await setup({ effect: 'wave', waveOrientation: orientation });

		// One int, three readings: OpenRazer's mouse, keyboard and accessory
		// drivers each document the same two values in their own terms.
		expect(screen.getByRole('radio', { name: first })).toBeChecked();
		expect(screen.getByRole('radio', { name: second })).toBeInTheDocument();
	});

	it('asks for two colours on breathe, the second of them empty', async () => {
		await setup({ effect: 'breathe' });

		expect(screen.getByLabelText('First colour')).toHaveValue('#00ff00');
		// Not black — nothing at all. OpenRazer's setBreathSingle and
		// setBreathDual are two different calls, so "no second colour" is a
		// state of its own. Asserted on the host rather than on the word "None",
		// which the effect list also carries as an option.
		expect(
			screen.getByLabelText('Second colour').closest('syn-color-picker'),
		).toHaveClass('syn-color-picker--empty');
		expect(screen.getByRole('checkbox', { name: 'Random' })).not.toBeChecked();
	});

	it('turns a single breath into a dual one', async () => {
		const { fixture } = await setup({ effect: 'breathe' });

		const second = screen.getByLabelText('Second colour') as HTMLInputElement;
		second.value = '#0000ff';
		second.dispatchEvent(new Event('input'));
		fixture.detectChanges();

		expect(fixture.componentInstance.settings().breathe.second).toBe('#0000ff');
	});

	it('takes a dual breath back to a single one', async () => {
		const { fixture } = await setup({
			effect: 'breathe',
			settings: {
				color: '#00ff00',
				direction: 'forward',
				breathe: { first: '#00ff00', second: '#0000ff', random: false },
			},
		});

		screen.getByRole('button', { name: 'Clear' }).click();
		fixture.detectChanges();

		expect(fixture.componentInstance.settings().breathe.second).toBeUndefined();
	});

	it('hands the colours over to the device when random is asked for', async () => {
		const { fixture } = await setup({ effect: 'breathe' });

		screen.getByRole('checkbox', { name: 'Random' }).click();
		fixture.detectChanges();

		expect(fixture.componentInstance.settings().breathe.random).toBe(true);
		// setBreathRandom: the device picks, so there is nothing left to choose.
		expect(screen.getByLabelText('First colour')).toBeDisabled();
		expect(screen.getByLabelText('Second colour')).toBeDisabled();
	});

	it('keeps a colour through a trip to another effect', async () => {
		const { fixture } = await setup({ effect: 'static' });

		const picker = screen.getByLabelText('Colour') as HTMLInputElement;
		picker.value = '#ff0000';
		picker.dispatchEvent(new Event('input'));
		fixture.detectChanges();

		// Every effect's settings are held at once, not just the current one's.
		fixture.componentRef.setInput('effect', 'spectrum');
		fixture.detectChanges();
		fixture.componentRef.setInput('effect', 'static');
		fixture.detectChanges();

		expect(screen.getByLabelText('Colour')).toHaveValue('#ff0000');
	});
});
