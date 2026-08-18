import { render, screen } from '@testing-library/angular';
import { KeyboardCustomizeSection } from './keyboard-customize';

const setup = (inputs: Record<string, unknown> = {}) =>
	render(KeyboardCustomizeSection, { inputs });

const kind = () =>
	screen.getByRole('combobox', { name: 'Assign to' }) as HTMLSelectElement;

describe('KeyboardCustomizeSection', () => {
	it('shows the keyboard, and the panels that were already here', async () => {
		await setup();

		expect(
			screen.getByRole('radiogroup', { name: 'Keyboard keys' }),
		).toBeVisible();
		expect(screen.getByRole('switch', { name: 'Gaming mode' })).toBeVisible();
		expect(screen.getByRole('switch', { name: 'Snap Tap' })).toBeVisible();
	});

	it('asks for a key before offering to assign one', async () => {
		await setup();

		expect(screen.getByText('Pick a control to assign it.')).toBeVisible();
	});

	it('follows the key that is picked', async () => {
		const { fixture } = await setup();

		screen.getByRole('radio', { name: 'F5' }).click();
		fixture.detectChanges();

		expect(screen.getByRole('heading', { name: 'F5' })).toBeVisible();
	});

	it('records an assignment against the key code', async () => {
		const { fixture } = await setup();

		screen.getByRole('radio', { name: 'A' }).click();
		fixture.detectChanges();
		kind().value = 'disabled';
		kind().dispatchEvent(new Event('change'));
		fixture.detectChanges();

		// The code, not the character: the same key types something else on
		// another layout.
		expect(fixture.componentInstance.bindings().default['KeyA']).toEqual({
			kind: 'disabled',
		});
	});

	it('marks a changed key on the drawing', async () => {
		const { container } = await setup({
			bindings: { default: { KeyA: { kind: 'disabled' } }, hypershift: {} },
		});

		expect(container.querySelectorAll('.key-grid__dot')).toHaveLength(1);
	});
});
