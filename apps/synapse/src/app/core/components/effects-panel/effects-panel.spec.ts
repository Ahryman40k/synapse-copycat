import { render, screen } from '@testing-library/angular';
import { CHROMA_EFFECTS, EffectsPanel } from './effects-panel';

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
		expect(labels).toEqual(['None', 'Static', 'Spectrum', 'Wave', 'Breathe']);
	});

	it('does not offer effects with no capability behind them', async () => {
		await setup();

		// `reactive` exists in OpenRazer but has no Rust capability yet, and
		// `dynamic` is not a chroma effect at all. Offering either would be a
		// control that cannot work.
		const values = CHROMA_EFFECTS.map((option) => option.value);
		expect(values).not.toContain('reactive');
		expect(values).not.toContain('dynamic');
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
});
