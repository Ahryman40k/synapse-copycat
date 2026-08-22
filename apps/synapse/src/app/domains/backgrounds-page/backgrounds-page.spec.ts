import { render, screen } from '@testing-library/angular';
import { BackgroundsPage } from './backgrounds-page';

describe('BackgroundsPage', () => {
	it('is titled and states the three parts', async () => {
		await render(BackgroundsPage);

		expect(
			screen.getByRole('heading', { name: 'Background manager' }),
		).toBeVisible();
		expect(screen.getByText(/library of images/)).toBeVisible();
		expect(screen.getByText(/colours out of each/)).toBeVisible();
		expect(screen.getByText(/Apply one to a group/)).toBeVisible();
	});

	it('names what each desktop needs, rather than promising one control', async () => {
		// ⚠️ The reason nothing is wired is that there is no common way in, and
		// a page claiming otherwise would be the wrong kind of empty.
		await render(BackgroundsPage);

		for (const desktop of ['GNOME', 'KDE Plasma', 'XFCE', 'swww, hyprpaper']) {
			expect(screen.getByText(desktop)).toBeVisible();
		}
	});
});
