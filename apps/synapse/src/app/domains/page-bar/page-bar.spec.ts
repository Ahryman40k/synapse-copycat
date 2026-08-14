import { Component } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import { type PageBarDescriptor, PageBarComponent } from './page-bar';

@Component({ template: 'customize' })
class CustomizePanel {}

@Component({ template: 'lighting' })
class LightingPanel {}

@Component({ template: 'power' })
class PowerPanel {}

const DESCRIPTOR: PageBarDescriptor = [
	{ title: 'customize', component: CustomizePanel },
	{ title: 'lighting', component: LightingPanel },
	{ title: 'power', component: PowerPanel },
];

const setup = (inputs: Record<string, unknown> = {}) =>
	render(PageBarComponent, {
		inputs: { descriptor: DESCRIPTOR, ...inputs },
	});

const tabs = () => screen.getAllByRole('tab');
const tab = (name: string) => screen.getByRole('tab', { name });

const press = (key: string) =>
	document.activeElement?.dispatchEvent(
		new KeyboardEvent('keydown', { key, bubbles: true }),
	);

describe('PageBar', () => {
	it('is a tablist, not a row of buttons', async () => {
		await setup({ ariaLabel: 'Mouse sections' });

		expect(
			screen.getByRole('tablist', { name: 'Mouse sections' }),
		).toBeVisible();
		expect(tabs()).toHaveLength(3);
	});

	it('marks the first section as selected by default', async () => {
		await setup();

		// The state the component previously did not have at all.
		expect(tab('customize')).toHaveAttribute('aria-selected', 'true');
		expect(tab('lighting')).toHaveAttribute('aria-selected', 'false');
	});

	it('points every tab at its panel', async () => {
		const { fixture } = await setup();
		const bar = fixture.componentInstance;

		expect(tab('customize')).toHaveAttribute(
			'aria-controls',
			bar.activePanelId(),
		);
		expect(tab('customize')).toHaveAttribute('id', bar.activeTabId());
	});

	it('moves the selection on click', async () => {
		const { fixture } = await setup();

		tab('lighting').click();
		fixture.detectChanges();

		expect(tab('lighting')).toHaveAttribute('aria-selected', 'true');
		expect(tab('customize')).toHaveAttribute('aria-selected', 'false');
		expect(fixture.componentInstance.activeItem().title).toBe('lighting');
	});

	it('still emits panelChanging for one-way consumers', async () => {
		const seen: string[] = [];
		const { fixture } = await render(PageBarComponent, {
			inputs: { descriptor: DESCRIPTOR },
			on: { panelChanging: (item: { title: string }) => seen.push(item.title) },
		});

		tab('power').click();
		fixture.detectChanges();

		expect(seen).toEqual(['power']);
	});

	describe('keyboard', () => {
		it('exposes a single tab stop, not one per tab', async () => {
			await setup();

			// Roving tabindex: crossing the bar takes one Tab press, then arrows.
			expect(tab('customize')).toHaveAttribute('tabindex', '0');
			expect(tab('lighting')).toHaveAttribute('tabindex', '-1');
			expect(tab('power')).toHaveAttribute('tabindex', '-1');
		});

		it('moves right and wraps', async () => {
			const { fixture } = await setup();
			tab('customize').focus();

			press('ArrowRight');
			fixture.detectChanges();
			expect(fixture.componentInstance.activeItem().title).toBe('lighting');

			press('ArrowRight');
			fixture.detectChanges();
			press('ArrowRight');
			fixture.detectChanges();
			expect(fixture.componentInstance.activeItem().title).toBe('customize');
		});

		it('moves left and wraps', async () => {
			const { fixture } = await setup();
			tab('customize').focus();

			press('ArrowLeft');
			fixture.detectChanges();

			expect(fixture.componentInstance.activeItem().title).toBe('power');
		});

		it('jumps to the ends with Home and End', async () => {
			const { fixture } = await setup();
			tab('customize').focus();

			press('End');
			fixture.detectChanges();
			expect(fixture.componentInstance.activeItem().title).toBe('power');

			press('Home');
			fixture.detectChanges();
			expect(fixture.componentInstance.activeItem().title).toBe('customize');
		});

		it('moves focus with the selection', async () => {
			const { fixture } = await setup();
			tab('customize').focus();

			press('ArrowRight');
			fixture.detectChanges();

			expect(tab('lighting')).toHaveFocus();
		});

		it('ignores keys it does not handle', async () => {
			const { fixture } = await setup();
			tab('customize').focus();

			press('ArrowDown');
			fixture.detectChanges();

			expect(fixture.componentInstance.activeItem().title).toBe('customize');
		});
	});
});
