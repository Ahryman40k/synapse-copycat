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

const setup = async (
	setters: { name: string; program: string }[] = [
		{ name: 'swww', program: 'swww' },
	],
) => {
	const rendered = await render(BackgroundsPage, {
		providers: [
			provideBackendApi(
				withMock({ ...unusedCommands(), ...mockWallpapers(setters) }),
			),
		],
	});

	return { ...rendered, store: TestBed.inject(ApplicationStore) };
};

/** Choose the folder and pick a picture, which every setting test needs. */
const openFolder = async (fixture: { detectChanges: () => void }) => {
	screen.getByRole('button', { name: 'Choose a folder…' }).click();
	await waitFor(() => {
		fixture.detectChanges();
		expect(screen.getByText('Harbour at dusk')).toBeVisible();
	});
	screen.getByText('Harbour at dusk').click();
	fixture.detectChanges();
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

	it('offers to set the wallpaper, and names what would do it', async () => {
		const { fixture } = await setup();
		await openFolder(fixture);

		expect(
			screen.getByRole('button', { name: 'Set as wallpaper' }),
		).toBeVisible();
		expect(screen.getByText(/with swww/)).toBeVisible();
	});

	it('says which setter did it', async () => {
		const { fixture } = await setup();
		await openFolder(fixture);

		screen.getByRole('button', { name: 'Set as wallpaper' }).click();

		await waitFor(() => {
			fixture.detectChanges();
			expect(screen.getByText(/Set with swww/)).toBeVisible();
		});
	});

	it('says so when nothing here can set a wallpaper', async () => {
		// ⚠️ A real situation, not a failure to look — a desktop none of the
		// adapters know. A control that silently does nothing would be the one
		// thing this page exists not to be.
		const { fixture } = await setup([]);
		await openFolder(fixture);

		expect(screen.getByText(/Nothing here can set a wallpaper/)).toBeVisible();
		expect(
			screen.queryByRole('button', { name: 'Set as wallpaper' }),
		).not.toBeInTheDocument();
	});

	it('lists what it found on this machine', async () => {
		await setup([{ name: 'GNOME', program: 'gsettings' }]);

		await waitFor(() => {
			expect(screen.getByText('GNOME')).toBeVisible();
		});
	});

	it('names what each desktop needs, rather than promising one control', async () => {
		// The reason nothing is wired is that there is no common way in, and a
		// page claiming otherwise would be the wrong kind of empty.
		await setup();

		for (const desktop of [
			'GNOME',
			'KDE Plasma',
			'XFCE',
			'swww, hyprpaper, feh',
		]) {
			expect(screen.getByText(desktop)).toBeVisible();
		}
	});
});
