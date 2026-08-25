import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { BackendApi, type Wallpaper } from '@synapse-copycat/backend-api';
import { safeParse, string } from 'valibot';

/** Where the chosen folder is remembered between runs. */
const STORAGE_KEY = 'synapse.wallpaperFolder';

/**
 * The folder someone chose last time.
 *
 * ⚠️ Parsed, not cast. What comes out of storage is external input like
 * anything crossing a boundary (root AGENTS.md §6) — written by an older
 * version, or edited. A value that is not a string is forgotten rather than
 * handed to the backend as a path.
 *
 * Whether the folder still *exists* is not checked here: the answer changes
 * between now and the read, and reading it is what finds out. An absent folder
 * comes back as an empty listing, which the page already knows how to say.
 */
function readFolder(storage: Storage | undefined): string | undefined {
	try {
		const saved = storage?.getItem(STORAGE_KEY);
		if (!saved) return undefined;

		const parsed = safeParse(string(), JSON.parse(saved));
		return parsed.success && parsed.output ? parsed.output : undefined;
	} catch {
		return undefined;
	}
}

/** Remember it. Failure is ignored: a preference is not worth an error. */
function writeFolder(storage: Storage | undefined, folder: string): void {
	try {
		storage?.setItem(STORAGE_KEY, JSON.stringify(folder));
	} catch {
		// Private browsing, a full quota, a webview with storage disabled — the
		// choice simply does not survive the session.
	}
}

const storage = () =>
	typeof localStorage === 'undefined' ? undefined : localStorage;

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
 * Root-provided, so the folder survives leaving the tab and coming back — and
 * the path is remembered between runs, because re-picking it on every launch is
 * the kind of small friction that makes a feature not worth opening.
 *
 * ⚠️ The path is remembered; the **listing is not**. Reading a folder decodes
 * and cuts every image in it, so doing that at startup would put seconds behind
 * a window opening for a tab nobody may visit. The page asks when it opens.
 */
type WallpapersState = {
	folder: string | undefined;
	wallpapers: Wallpaper[];
	/** True while a folder is being read — it takes a moment, visibly. */
	reading: boolean;
	/** The one being looked at, if any. */
	chosen: Wallpaper | undefined;

	/**
	 * What this machine can set a wallpaper with, most appropriate first.
	 *
	 * ⚠️ Empty is a real answer, not a failure to look — a desktop none of the
	 * adapters know is a situation the page has to be able to state.
	 */
	setters: { name: string; program: string }[];

	/** What the last attempt said, good or bad. Cleared by the next one. */
	lastSet: { setter?: string; problem?: string } | undefined;
};

/**
 * ⚠️ A factory, not a constant. Read once at module load, the remembered folder
 * would be frozen for the life of the process — which is invisible in a running
 * application, where the module loads once, and wrong everywhere else: a test
 * that writes the value and builds a second store gets the first one's answer.
 */
const initial = (): WallpapersState => ({
	folder: readFolder(storage()),
	wallpapers: [],
	reading: false,
	chosen: undefined,
	setters: [],
	lastSet: undefined,
});

export const WallpapersStore = signalStore(
	{ providedIn: 'root' },
	withState<WallpapersState>(initial),

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
			writeFolder(storage(), folder);
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

		/** Ask what this machine can set a wallpaper with. */
		async findSetters(): Promise<void> {
			try {
				patchState(store, {
					setters: await backendApi.invoke('wallpaper_setters', {}),
				});
			} catch (error) {
				// Not fatal: the page falls back to saying it found nothing,
				// which is the same thing it says when the answer is empty.
				console.warn('[synapse] could not ask for wallpaper setters', error);
				patchState(store, { setters: [] });
			}
		},

		/**
		 * Put the chosen picture on the desktop.
		 *
		 * ⚠️ Reports which setter did it, or why none could. A control that
		 * silently does nothing on three desktops out of four is the thing this
		 * page exists not to be.
		 */
		async setWallpaper(): Promise<void> {
			const chosen = store.chosen();
			if (!chosen) return;

			patchState(store, { lastSet: undefined });
			try {
				const setter = await backendApi.invoke('set_wallpaper', {
					path: chosen.path,
				});
				patchState(store, { lastSet: { setter } });
			} catch (error) {
				patchState(store, {
					lastSet: {
						problem: error instanceof Error ? error.message : String(error),
					},
				});
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
