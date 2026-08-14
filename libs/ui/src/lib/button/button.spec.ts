import { Component, signal } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import { Button } from './button';

/**
 * The component is attribute-only, so it cannot be rendered on its own — it has
 * to be applied to a host element. That is the point of the design: everything
 * asserted below about roles, focus and disabling comes from the native
 * element, not from code in the component.
 */
@Component({
	imports: [Button],
	template: `
		<button syn-button [variant]="variant()" [disabled]="disabled()">
			Apply
		</button>
		<a syn-button variant="secondary" href="#somewhere">Docs</a>
	`,
})
class Host {
	readonly variant = signal<'primary' | 'secondary' | 'ghost'>('primary');
	readonly disabled = signal(false);
}

const setup = () => render(Host);

const button = () => screen.getByRole('button', { name: 'Apply' });
const link = () => screen.getByRole('link', { name: 'Docs' });

describe('Button', () => {
	it('keeps the native button semantics', async () => {
		await setup();

		expect(button()).toBeVisible();
		expect(button().tagName).toBe('BUTTON');
	});

	it('also applies to an anchor, which stays a link', async () => {
		await setup();

		expect(link().tagName).toBe('A');
		expect(link()).toHaveAttribute('href', '#somewhere');
	});

	it('projects its content', async () => {
		await setup();

		expect(button()).toHaveTextContent('Apply');
	});

	it('defaults to the primary variant', async () => {
		await setup();

		expect(button()).toHaveAttribute('data-variant', 'primary');
	});

	it('reflects the variant for the theme file to select on', async () => {
		const { fixture } = await setup();

		fixture.componentInstance.variant.set('ghost');
		fixture.detectChanges();

		expect(button()).toHaveAttribute('data-variant', 'ghost');
	});

	it('reads a statically declared variant', async () => {
		await setup();

		expect(link()).toHaveAttribute('data-variant', 'secondary');
	});

	it('is reachable and activatable from the keyboard', async () => {
		await setup();

		button().focus();
		expect(button()).toHaveFocus();
	});

	it('does not fire when the native disabled attribute is set', async () => {
		const { fixture } = await setup();
		const clicks: unknown[] = [];
		button().addEventListener('click', (event) => clicks.push(event));

		fixture.componentInstance.disabled.set(true);
		fixture.detectChanges();

		expect(button()).toBeDisabled();

		button().click();
		expect(clicks).toHaveLength(0);
	});

	it('fires normally when enabled', async () => {
		await setup();
		const clicks: unknown[] = [];
		button().addEventListener('click', (event) => clicks.push(event));

		button().click();

		expect(clicks).toHaveLength(1);
	});
});
