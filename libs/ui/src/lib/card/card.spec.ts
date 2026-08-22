import { Component, signal } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import { Card } from './card';

@Component({
	imports: [Card],
	template: `
		<button
			syn-card
			type="button"
			image="assets/devices/5426-0136.png"
			[disabled]="disabled()"
			(click)="opened()"
		>
			<span>Razer Basilisk Ultimate</span>
		</button>
		<a syn-card href="#docs">Open the docs</a>
	`,
})
class Host {
	readonly disabled = signal(false);
	opens = 0;
	opened(): void {
		this.opens++;
	}
}

const card = () =>
	screen.getByRole('button', { name: /Razer Basilisk Ultimate/ });

describe('Card', () => {
	it('is a real button, not a clickable div', async () => {
		await render(Host);

		expect(card().tagName).toBe('BUTTON');
	});

	it('also applies to an anchor, which stays a link', async () => {
		await render(Host);

		const link = screen.getByRole('link', { name: 'Open the docs' });
		expect(link).toHaveAttribute('href', '#docs');
	});

	it('projects its content', async () => {
		await render(Host);

		expect(card()).toHaveTextContent('Razer Basilisk Ultimate');
	});

	it('activates on click', async () => {
		const { fixture } = await render(Host);

		card().click();

		expect(fixture.componentInstance.opens).toBe(1);
	});

	it('is reachable from the keyboard', async () => {
		await render(Host);

		card().focus();

		expect(card()).toHaveFocus();
	});

	it('does not activate when disabled', async () => {
		const { fixture } = await render(Host);
		fixture.componentInstance.disabled.set(true);
		fixture.detectChanges();

		expect(card()).toBeDisabled();

		card().click();
		expect(fixture.componentInstance.opens).toBe(0);
	});

	it('renders the image itself rather than taking a projected one', async () => {
		const { fixture } = await render(Host);

		// Encapsulated styles cannot reach projected content, so a projected
		// <img> kept its intrinsic size and overflowed the card. Owning the
		// element is what makes the sizing rule apply at all.
		const image = (fixture.nativeElement as HTMLElement).querySelector('img');
		expect(image).toHaveClass('syn-card__media');
		expect(image).toHaveAttribute('src', 'assets/devices/5426-0136.png');
	});

	it('hides the image from assistive technology by default', async () => {
		const { fixture } = await render(Host);

		// The card's own text already says what it is; announcing the picture as
		// well would only repeat it.
		expect(
			(fixture.nativeElement as HTMLElement).querySelector('img'),
		).toHaveAttribute('alt', '');
	});

	it('renders no image element when none is given', async () => {
		const { fixture } = await render(
			'<a syn-card href="#docs">Open the docs</a>',
			{ imports: [Card] },
		);

		expect(
			(fixture.nativeElement as HTMLElement).querySelector('img'),
		).toBeNull();
	});
});

describe('Card, a picture that is not there', () => {
	it('drops an image that fails to load', async () => {
		// ⚠️ Not every device has a picture in the repository. The broken-image
		// icon reads as something lost rather than as something never drawn.
		await render('<button syn-card image="/nothing.png">Kraken</button>', {
			imports: [Card],
		});

		const image = document.querySelector('img') as HTMLImageElement;
		image.dispatchEvent(new Event('error'));
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(document.querySelector('img')).toBeNull();
		expect(screen.getByRole('button', { name: 'Kraken' })).toBeVisible();
	});

	it('gives a different picture a fair try', async () => {
		// Remembered by source, not by a flag: a card whose image changes must
		// not inherit the last one's failure.
		const { rerender } = await render(
			'<button syn-card [image]="image">Kraken</button>',
			{ imports: [Card], componentProperties: { image: '/nothing.png' } },
		);

		(document.querySelector('img') as HTMLImageElement).dispatchEvent(
			new Event('error'),
		);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(document.querySelector('img')).toBeNull();

		await rerender({ componentProperties: { image: '/something.png' } });

		expect(document.querySelector('img')).not.toBeNull();
	});
});
