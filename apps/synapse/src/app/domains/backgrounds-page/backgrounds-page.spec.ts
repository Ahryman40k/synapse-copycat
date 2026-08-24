import { TestBed } from '@angular/core/testing';
import {
	mockWallpapers,
	provideBackendApi,
	unusedCommands,
	withMock,
} from '@synapse-copycat/backend-api';
import { render, screen, waitFor } from '@testing-library/angular';
import { ApplicationStore } from '../../core/stores/application-store';
import { BackgroundsPage } from './backgrounds-page';

const setup = async () => {
	const rendered = await render(BackgroundsPage, {
		providers: [
			provideBackendApi(withMock({ ...unusedCommands(), ...mockWallpapers() })),
		],
	});

	return { ...rendered, store: TestBed.inject(ApplicationStore) };
};

describe('BackgroundsPage', () => {
	it('is titled and offers to choose a folder', async () => {
		await setup();

		expect(
			screen.getByRole('heading', { name: 'Background manager' }),
		).toBeVisible();
		expect(
			screen.getByRole('button', { name: 'Choose a folder…' }),
		).toBeVisible();
		expect(screen.getByText('No folder chosen yet.')).toBeVisible();
	});

	it('reads a folder and shows what is in it', async () => {
		const { fixture } = await setup();

		screen.getByRole('button', { name: 'Choose a folder…' }).click();

		await waitFor(() => {
			fixture.detectChanges();
			expect(screen.getByText('Harbour at dusk')).toBeVisible();
		});
		// Every image carries its palette, laid out as a strip in the order it
		// will be laid along a device.
		expect(
			fixture.nativeElement.querySelectorAll('.backgrounds-page__swatch'),
		).toHaveLength(20);
	});

	it('previews a picture as an ambience before anything is applied', async () => {
		const { fixture } = await setup();
		screen.getByRole('button', { name: 'Choose a folder…' }).click();
		await waitFor(() => {
			fixture.detectChanges();
			expect(screen.getByText('Harbour at dusk')).toBeVisible();
		});

		screen.getByText('Harbour at dusk').click();
		fixture.detectChanges();

		expect(
			screen.getByRole('img', { name: 'Harbour at dusk as an ambience' }),
		).toBeVisible();
	});

	it('says the wallpaper itself is not set', async () => {
		// ⚠️ Two of the three parts work. Doing half of it silently would be
		// worse than doing half of it out loud.
		const { fixture } = await setup();
		screen.getByRole('button', { name: 'Choose a folder…' }).click();
		await waitFor(() => {
			fixture.detectChanges();
			expect(screen.getByText('Harbour at dusk')).toBeVisible();
		});
		screen.getByText('Harbour at dusk').click();
		fixture.detectChanges();

		expect(screen.getByText(/It does not set the wallpaper/)).toBeVisible();
	});

	it('names what each desktop needs, rather than promising one control', async () => {
		// The reason nothing is wired is that there is no common way in, and a
		// page claiming otherwise would be the wrong kind of empty.
		await setup();

		for (const desktop of ['GNOME', 'KDE Plasma', 'XFCE', 'swww, hyprpaper']) {
			expect(screen.getByText(desktop)).toBeVisible();
		}
	});
});
