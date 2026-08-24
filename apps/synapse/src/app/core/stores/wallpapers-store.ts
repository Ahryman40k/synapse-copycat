import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { BackendApi, type Wallpaper } from '@synapse-copycat/backend-api';

/**
 * The wallpaper library: a folder, what is in it, and which one is chosen.
 *
 * **Its own store, separate from `ApplicationStore`.** Which picture someone is
 * looking at is one page's business and nothing else's — no other screen asks,
 * and no other screen should have to skip past it to find what it needs.
 *
 * ⚠️ **Here and not beside the page, because the page is a lazy chunk.** A
 * `providedIn: 'root'` store declared inside `backgrounds-page` would have its
 * code fetched with that page: it would not exist until someone had visited the
 * tab, and anything else reaching for it would drag the whole page in behind
 * it. The state is one page's; the store is not something to load on demand.
 *
 * What crosses back into the application is a **palette**. The main store takes
 * a list of colours and has no idea an image was involved, which is what keeps
 * a second source of colours — a camera, a theme file, a colour picked from the
 * screen — from having to be threaded through it as another special case.
 *
 * Root-provided, so the folder survives leaving the tab and coming back. It
 * does **not** survive a restart; the sources preference does, and this could
 * learn the same trick if re-picking on every launch turns out to grate.
 */
type WallpapersState = {
	folder: string | undefined;
	wallpapers: Wallpaper[];
	/** True while a folder is being read — it takes a moment, visibly. */
	reading: boolean;
	/** The one being looked at, if any. */
	chosen: Wallpaper | undefined;
};

const INITIAL: WallpapersState = {
	folder: undefined,
	wallpapers: [],
	reading: false,
	chosen: undefined,
};

export const WallpapersStore = signalStore(
	{ providedIn: 'root' },
	withState<WallpapersState>(INITIAL),

	withMethods((store, backendApi = inject(BackendApi)) => ({
		/**
		 * Ask for a folder, then read it.
		 *
		 * Nothing happens when the dialog is dismissed, which is not an error —
		 * changing your mind is a thing people do, and an interface that
		 * complains about it is worse than one that says nothing.
		 */
		async chooseFolder(): Promise<void> {
			const folder = await backendApi.invoke('choose_wallpaper_folder', {});
			if (!folder) return;

			patchState(store, { folder, chosen: undefined });
			await this.read();
		},

		/**
		 * Read the chosen folder again.
		 *
		 * ⚠️ Slow enough to notice: every image is decoded and cut. The flag is
		 * what lets the page say so rather than looking frozen.
		 */
		async read(): Promise<Wallpaper[]> {
			const folder = store.folder();
			if (!folder) return [];

			patchState(store, { reading: true });
			try {
				const wallpapers = await backendApi.invoke('wallpapers', { folder });
				// Anything chosen before is gone with the listing it came from.
				patchState(store, { wallpapers, chosen: undefined });
				return wallpapers;
			} finally {
				patchState(store, { reading: false });
			}
		},

		/** Pressing the chosen one again puts it down, so a choice can be undone. */
		choose(wallpaper: Wallpaper): void {
			patchState(store, {
				chosen: store.chosen()?.path === wallpaper.path ? undefined : wallpaper,
			});
		},
	})),
);
export type WallpapersStore = InstanceType<typeof WallpapersStore>;
