import { render, screen } from '@testing-library/angular';
import { describeCombination, KeyCapture } from './key-capture';

const press = (init: KeyboardEventInit) =>
	new KeyboardEvent('keydown', { bubbles: true, ...init });

const setup = (inputs: Record<string, unknown> = {}) =>
	render(KeyCapture, { inputs });

const field = () => screen.getByRole('button', { name: 'Key combination' });

describe('describeCombination', () => {
	it('names a key by its physical code, not the character it types', () => {
		// The same key is Q on QWERTY and A on AZERTY; a remapping names the key.
		expect(describeCombination(press({ code: 'KeyQ', key: 'a' }))).toBe('Q');
		expect(describeCombination(press({ code: 'Digit1', key: '&' }))).toBe('1');
	});

	it('always lists modifiers in reading order', () => {
		const combination = describeCombination(
			press({ code: 'KeyK', shiftKey: true, ctrlKey: true, altKey: true }),
		);

		expect(combination).toBe('Ctrl + Alt + Shift + K');
	});

	it('waits while only a modifier is held', () => {
		// Holding Ctrl is a prefix, not a combination.
		expect(
			describeCombination(
				press({ code: 'ControlLeft', key: 'Control', ctrlKey: true }),
			),
		).toBeUndefined();
	});

	it('gives readable names to the awkward keys', () => {
		expect(
			describeCombination(press({ code: 'ArrowUp', key: 'ArrowUp' })),
		).toBe('Up');
		expect(describeCombination(press({ code: 'Numpad7', key: '7' }))).toBe(
			'Num 7',
		);
		expect(describeCombination(press({ code: 'F5', key: 'F5' }))).toBe('F5');
	});
});

describe('KeyCapture', () => {
	it('says when nothing is set', async () => {
		await setup();

		expect(field()).toHaveTextContent('Not set');
	});

	it('shows what it is holding', async () => {
		await setup({ value: 'Ctrl + K' });

		expect(field()).toHaveTextContent('Ctrl + K');
	});

	it('ignores keys until it is armed', async () => {
		const { fixture } = await setup();

		// Otherwise it would swallow every keystroke on the page, including the
		// ones meant to leave it.
		field().dispatchEvent(press({ code: 'KeyK' }));
		fixture.detectChanges();

		expect(fixture.componentInstance.value()).toBe('');
	});

	it('records the next combination once armed', async () => {
		const { fixture } = await setup();

		field().click();
		fixture.detectChanges();
		expect(field()).toHaveTextContent('Press a key…');

		field().dispatchEvent(press({ code: 'KeyK', ctrlKey: true }));
		fixture.detectChanges();

		expect(fixture.componentInstance.value()).toBe('Ctrl + K');
		expect(field()).toHaveTextContent('Ctrl + K');
	});

	it('takes Tab and Enter rather than letting them leave', async () => {
		const { fixture } = await setup();

		field().click();
		fixture.detectChanges();
		field().dispatchEvent(press({ code: 'Tab', key: 'Tab' }));
		fixture.detectChanges();

		expect(fixture.componentInstance.value()).toBe('Tab');
	});

	it('gives up on Escape without changing anything', async () => {
		const { fixture } = await setup({ value: 'Ctrl + K' });

		field().click();
		fixture.detectChanges();
		field().dispatchEvent(press({ code: 'Escape', key: 'Escape' }));
		fixture.detectChanges();

		expect(fixture.componentInstance.value()).toBe('Ctrl + K');
		expect(field()).toHaveTextContent('Ctrl + K');
	});

	it('can be emptied', async () => {
		const { fixture } = await setup({ value: 'Ctrl + K' });

		screen.getByRole('button', { name: 'Clear the key combination' }).click();
		fixture.detectChanges();

		expect(fixture.componentInstance.value()).toBe('');
	});
});
