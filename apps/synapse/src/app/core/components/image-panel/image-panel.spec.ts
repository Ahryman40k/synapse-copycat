import { render, screen } from '@testing-library/angular';
import { ImagePanel } from './image-panel';

const setup = (inputs: Record<string, unknown> = {}) =>
	render(ImagePanel, { inputs });

const preset = (name: string) => screen.getByRole('button', { name });
const slider = (name: string) =>
	screen.getByRole('slider', { name }) as HTMLInputElement;

describe('ImagePanel', () => {
	it('offers the five presets, default applied', async () => {
		await setup();

		const group = screen.getByRole('group', { name: 'Picture preset' });
		expect(group).toBeVisible();

		const names = screen
			.getAllByRole('button')
			.map((button) => button.textContent?.trim());
		expect(names).toEqual(['default', 'cool', 'vibrant', 'warm', 'custom']);
		expect(preset('default')).toHaveAttribute('aria-pressed', 'true');

		// Filled for the applied one, outlined for the rest.
		expect(preset('default')).toHaveAttribute('data-variant', 'primary');
		expect(preset('warm')).toHaveAttribute('data-variant', 'secondary');
	});

	it('applies a preset to the sliders', async () => {
		const { fixture } = await setup();

		preset('vibrant').click();
		fixture.detectChanges();

		expect(preset('vibrant')).toHaveAttribute('aria-pressed', 'true');
		expect(preset('default')).toHaveAttribute('aria-pressed', 'false');
		expect(slider('Saturation').valueAsNumber).toBe(75);
	});

	it('falls back to custom when a slider is moved', async () => {
		const { fixture } = await setup();

		// The picture no longer matches the preset that was chosen, and leaving
		// it lit would claim otherwise.
		slider('Contrast').value = '80';
		slider('Contrast').dispatchEvent(new Event('input'));
		fixture.detectChanges();

		expect(fixture.componentInstance.value().preset).toBe('custom');
		expect(preset('custom')).toHaveAttribute('aria-pressed', 'true');
	});

	it('leaves the levels alone when custom is chosen outright', async () => {
		const { fixture } = await setup();

		preset('custom').click();
		fixture.detectChanges();

		expect(fixture.componentInstance.value().brightness).toBe(50);
		expect(fixture.componentInstance.value().preset).toBe('custom');
	});

	it('measures white balance in kelvin, not in the 0-100 of the others', async () => {
		await setup();

		expect(slider('White balance').min).toBe('2000');
		expect(slider('White balance').max).toBe('7500');
		expect(slider('Brightness').max).toBe('100');
	});

	it('moves white balance with the preset', async () => {
		const { fixture } = await setup();

		preset('warm').click();
		fixture.detectChanges();

		// A warm picture is a low temperature, not a high one.
		expect(fixture.componentInstance.value().whiteBalance).toBe(3200);
	});

	it('disables white balance while the camera chooses it', async () => {
		await setup();

		expect(
			screen.getByRole('switch', { name: 'White balance: auto' }),
		).toBeChecked();
		expect(slider('White balance')).toBeDisabled();
	});

	it('hands white balance back when auto is switched off', async () => {
		const { fixture } = await setup();

		screen.getByRole('switch', { name: 'White balance: auto' }).click();
		fixture.detectChanges();

		expect(slider('White balance')).toBeEnabled();
	});
});
