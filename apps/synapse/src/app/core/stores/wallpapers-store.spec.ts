import { TestBed } from '@angular/core/testing';
import {
	mockWallpapers,
	provideBackendApi,
	unusedCommands,
	withMock,
} from '@synapse-copycat/backend-api';
import { WallpapersStore } from './wallpapers-store';

/**
 * The wallpaper library, on its own.
 *
 * Its own store because which picture someone is looking at is one page's
 * business — and what leaves it is a palette, so nothing else has to learn that
 * an image was involved.
 */
const setup = () => {
	TestBed.configureTestingModule({
		providers: [
			provideBackendApi(withMock({ ...unusedCommands(), ...mockWallpapers() })),
		],
	});
	return TestBed.inject(WallpapersStore);
};

describe('WallpapersStore', () => {
	beforeEach(() => localStorage.clear());

	it('starts with nothing chosen', () => {
		const store = setup();

		expect(store.folder()).toBeUndefined();
		expect(store.wallpapers()).toEqual([]);
		expect(store.chosen()).toBeUndefined();
	});

	it('reads the folder it was given', async () => {
		const store = setup();

		await store.chooseFolder();

		expect(store.folder()).toContain('Wallpapers');
		expect(store.wallpapers().length).toBeGreaterThan(0);
		// Every image carries the colours in it, ordered by hue.
		expect(store.wallpapers()[0].palette.length).toBeGreaterThan(1);
	});

	it('does nothing when the dialog is dismissed', async () => {
		// ⚠️ Not an error. Changing your mind is a thing people do, and an
		// interface that complains about it is worse than one that says nothing.
		TestBed.configureTestingModule({
			providers: [
				provideBackendApi(
					withMock({ ...unusedCommands(), choose_wallpaper_folder: null }),
				),
			],
		});
		const store = TestBed.inject(WallpapersStore);

		await store.chooseFolder();

		expect(store.folder()).toBeUndefined();
	});

	it('puts a chosen picture back down when it is chosen again', async () => {
		const store = setup();
		await store.chooseFolder();
		const first = store.wallpapers()[0];

		store.choose(first);
		expect(store.chosen()?.path).toBe(first.path);

		store.choose(first);
		expect(store.chosen()).toBeUndefined();
	});

	it('forgets the chosen picture when the folder is read again', async () => {
		// It came from a listing that no longer exists — keeping it would leave
		// the page pointing at something the folder may not hold any more.
		const store = setup();
		await store.chooseFolder();
		store.choose(store.wallpapers()[0]);

		await store.read();

		expect(store.chosen()).toBeUndefined();
	});

	it('remembers the folder between runs', async () => {
		// Re-picking it on every launch is the kind of small friction that makes
		// a feature not worth opening.
		const store = setup();
		await store.chooseFolder();
		const chosen = store.folder();

		// A second store, as a fresh launch would build.
		TestBed.resetTestingModule();
		const next = setup();

		expect(next.folder()).toBe(chosen);
	});

	it('does not remember the listing', async () => {
		// ⚠️ Reading a folder decodes and cuts every image in it. Doing that at
		// startup would put seconds behind a window opening, for a tab nobody
		// may visit.
		const store = setup();
		await store.chooseFolder();

		TestBed.resetTestingModule();
		const next = setup();

		expect(next.folder()).toBeDefined();
		expect(next.wallpapers()).toEqual([]);
	});

	it('forgets a remembered value it cannot read', () => {
		// Storage is external input like anything crossing a boundary: written
		// by an older version, or edited. A path is not something to hand the
		// backend on trust.
		localStorage.setItem('synapse.wallpaperFolder', '{"not":"a string"}');

		expect(setup().folder()).toBeUndefined();
	});
});
