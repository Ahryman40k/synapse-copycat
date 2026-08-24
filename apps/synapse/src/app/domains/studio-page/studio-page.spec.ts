import { render, screen } from '@testing-library/angular';
import { StudioPage } from './studio-page';

describe('StudioPage', () => {
	it('is titled and says what it is for', async () => {
		await render(StudioPage);

		expect(
			screen.getByRole('heading', { name: 'Effect studio' }),
		).toBeVisible();
		expect(screen.getByText(/becomes another choice/)).toBeVisible();
	});

	it('previews what is being built, and lets it be changed', async () => {
		await render(StudioPage);

		expect(
			screen.getByRole('img', { name: 'The ambience being built' }),
		).toBeVisible();
		expect(
			screen.getByRole('combobox', { name: 'Colour source' }),
		).toBeVisible();
	});

	it('says the effect decides colour and nothing else', async () => {
		// ⚠️ Not a limitation. A colour source composes with every motion and
		// every brightness, including ones added later; an effect deciding all
		// three would be a fourth kind of thing that only works alone.
		await render(StudioPage);

		expect(screen.getByRole('heading', { name: 'Colour only' })).toBeVisible();
		expect(screen.getByText(/composes with every motion/)).toBeVisible();
	});

	it('says plainly that nothing is saved', async () => {
		// A workspace that quietly forgets what was made in it is worse than one
		// that says it will.
		await render(StudioPage);

		expect(screen.getByRole('heading', { name: 'Not yet' })).toBeVisible();
	});
});
