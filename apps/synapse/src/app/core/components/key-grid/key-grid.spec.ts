import { render, screen } from '@testing-library/angular';
import { ANSI_KEYS } from '../../models/keyboard-layout';
import { KeyGrid } from './key-grid';

const setup = (inputs: Record<string, unknown> = {}) =>
	render(KeyGrid, { inputs });

describe('KeyGrid', () => {
	it('draws a full-size keyboard as one radio group', async () => {
		await setup();

		// With 104 keys the single tab stop a radio group gives is the point.
		expect(
			screen.getByRole('radiogroup', { name: 'Keyboard keys' }),
		).toBeVisible();
		expect(screen.getAllByRole('radio')).toHaveLength(ANSI_KEYS.length);
		expect(ANSI_KEYS).toHaveLength(104);
	});

	it('takes nothing until a key is picked', async () => {
		await setup();

		for (const key of screen.getAllByRole('radio')) {
			expect(key).not.toBeChecked();
		}
	});

	it('reflects the selected code', async () => {
		await setup({ selected: 'KeyA' });

		expect(screen.getByRole('radio', { name: 'A' })).toBeChecked();
	});

	it('reports a pick through the model', async () => {
		const { fixture } = await setup();

		screen.getByRole('radio', { name: 'Space' }).click();
		fixture.detectChanges();

		expect(fixture.componentInstance.selected()).toBe('Space');
	});

	it('marks the keys that are no longer on their default', async () => {
		const { container } = await setup({ changed: ['KeyA', 'F5'] });

		expect(container.querySelectorAll('.key-grid__dot')).toHaveLength(2);
	});

	it('names keys by their code, not by the character they type', async () => {
		await setup();

		// `KeyboardEvent.code` is layout-independent, which is what a remapping
		// has to name — the same physical key is Q on QWERTY and A on AZERTY.
		const codes = ANSI_KEYS.map((key) => key.code);
		expect(codes).toContain('KeyQ');
		expect(codes).toContain('NumpadEnter');
		expect(new Set(codes).size).toBe(codes.length);
	});
});
