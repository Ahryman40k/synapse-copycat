import { render, screen } from '@testing-library/angular';
import { SensitivityPanel } from './sensitivity-panel';

const setup = (inputs: Record<string, unknown> = {}) =>
	render(SensitivityPanel, { inputs });

const stages = () => screen.getByRole('switch', { name: 'Sensitivity Stages' });
const slider = (name: string) =>
	screen.getByRole('slider', { name }) as HTMLInputElement;

describe('SensitivityPanel', () => {
	it('is titled and says what the number means', async () => {
		await setup();

		expect(screen.getByRole('heading', { name: 'Sensitivity' })).toBeVisible();
		expect(
			screen.getByText('The number of dots-per-inch (DPI) of mouse movement.'),
		).toBeVisible();
	});

	it('shows one slider over the whole range while stages are off', async () => {
		await setup();

		expect(stages()).not.toBeChecked();
		expect(screen.getAllByRole('slider')).toHaveLength(1);
		expect(slider('DPI').min).toBe('100');
		expect(slider('DPI').max).toBe('20000');
		expect(slider('DPI').valueAsNumber).toBe(9700);
	});

	it('shows the five stages once switched on', async () => {
		const { fixture } = await setup();

		stages().click();
		fixture.detectChanges();

		expect(screen.getAllByRole('slider')).toHaveLength(5);
		expect(
			[1, 2, 3, 4, 5].map((n) => slider(`Stage ${n} DPI`).valueAsNumber),
		).toEqual([850, 1800, 4000, 9700, 20000]);
	});

	it('gives every stage the same scale', async () => {
		await setup({
			value: {
				staged: true,
				dpi: 9700,
				stages: [850, 1800, 4000, 9700, 20000],
			},
		});

		// Narrowing min/max per stage would give each its own scale, so the same
		// thumb position would mean a different DPI on each track.
		for (const n of [1, 2, 3, 4, 5]) {
			expect(slider(`Stage ${n} DPI`).min).toBe('100');
			expect(slider(`Stage ${n} DPI`).max).toBe('20000');
		}
	});

	it('stops a stage at the one above it', async () => {
		const { fixture } = await setup({
			value: {
				staged: true,
				dpi: 9700,
				stages: [850, 1800, 4000, 9700, 20000],
			},
		});

		const third = slider('Stage 3 DPI');
		third.value = '15000';
		third.dispatchEvent(new Event('input'));
		fixture.detectChanges();

		// Held at stage 4, and the thumb put back with it — otherwise it would
		// sit at 15000 with the model saying 9700.
		expect(fixture.componentInstance.value().stages[2]).toBe(9700);
		expect(third.valueAsNumber).toBe(9700);
	});

	it('stops a stage at the one below it', async () => {
		const { fixture } = await setup({
			value: {
				staged: true,
				dpi: 9700,
				stages: [850, 1800, 4000, 9700, 20000],
			},
		});

		const third = slider('Stage 3 DPI');
		third.value = '200';
		third.dispatchEvent(new Event('input'));
		fixture.detectChanges();

		expect(fixture.componentInstance.value().stages[2]).toBe(1800);
		expect(third.valueAsNumber).toBe(1800);
	});

	it('keeps the five in order however one is dragged', async () => {
		const { fixture } = await setup({
			value: {
				staged: true,
				dpi: 9700,
				stages: [850, 1800, 4000, 9700, 20000],
			},
		});

		// The bounds are mutual, so a stage cannot cross a neighbour and the
		// neighbour cannot cross back. Nothing needs re-clamping after a move.
		slider('Stage 2 DPI').value = '9000';
		slider('Stage 2 DPI').dispatchEvent(new Event('input'));
		fixture.detectChanges();

		const values = fixture.componentInstance.value().stages;
		expect(values).toEqual([850, 4000, 4000, 9700, 20000]);
		expect([...values].sort((a, b) => a - b)).toEqual(values);
	});

	it('reports a single-value change through the model', async () => {
		const { fixture } = await setup();

		slider('DPI').value = '1600';
		slider('DPI').dispatchEvent(new Event('input'));
		fixture.detectChanges();

		expect(fixture.componentInstance.value().dpi).toBe(1600);
	});

	it('keeps the stages while the single value is in use, and back', async () => {
		const { fixture } = await setup();

		stages().click();
		fixture.detectChanges();
		stages().click();
		fixture.detectChanges();

		expect(fixture.componentInstance.value()).toEqual({
			staged: false,
			dpi: 9700,
			stages: [850, 1800, 4000, 9700, 20000],
		});
	});
});
