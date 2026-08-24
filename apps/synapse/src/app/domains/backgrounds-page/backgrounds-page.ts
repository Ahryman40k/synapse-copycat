import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
} from '@angular/core';
import type { GroupId, Wallpaper } from '@synapse-copycat/backend-api';
import { Button, Panel } from '@synapse-copycat/ui';
import { AmbiencePreview } from '../../core/components/ambience-preview/ambience-preview';
import { ApplicationStore } from '../../core/stores/application-store';
import { WallpapersStore } from '../../core/stores/wallpapers-store';

/**
 * Wallpapers, the colours in them, and the groups they drive.
 *
 * Three parts, and the middle one is what makes it worth having:
 *
 * 1. **A library of images** — a folder the user points at.
 * 2. **The colours in each** — a handful cut out of the picture, not one
 *    average, which on most photographs is mud.
 * 3. **Applied to a group** — the lighting takes the picture's colours.
 *
 * Two of the three work. ⚠️ Setting the wallpaper itself does not, and the page
 * says so: there is no common way in on Linux, so it needs an adapter per
 * desktop rather than a call.
 *
 * The library lives in `WallpapersStore`; the only thing that reaches the
 * application store is a **palette**, handed to a group. `ApplicationStore` has
 * no idea an image was involved, which is what keeps a second source of colours
 * — a camera, a theme file, one picked off the screen — from having to be
 * threaded through it as another special case.
 */
@Component({
	selector: 'backgrounds-page',
	templateUrl: './backgrounds-page.html',
	styleUrl: './backgrounds-page.scss',
	imports: [AmbiencePreview, Button, Panel],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackgroundsPage {
	readonly #store = inject(ApplicationStore);
	readonly #library = inject(WallpapersStore);

	protected readonly folder = this.#library.folder;
	protected readonly wallpapers = this.#library.wallpapers;
	protected readonly reading = this.#library.reading;
	protected readonly chosen = this.#library.chosen;

	protected readonly groups = this.#store.groups;

	/** What that palette would look like on a device, before committing to it. */
	protected readonly preview = computed(() => {
		const chosen = this.chosen();
		if (!chosen) return undefined;

		return {
			colour: {
				type: 'palette' as const,
				colours: chosen.palette,
				// Held still: this palette is about the picture, and drifting
				// loses the mapping.
				turnsPerSecond: 0,
			},
			motion: { type: 'none' as const },
			brightness: { type: 'fixed' as const, level: 1 },
		};
	});

	protected choose(): Promise<void> {
		return this.#library.chooseFolder();
	}

	protected reread(): Promise<unknown> {
		return this.#library.read();
	}

	protected pick(wallpaper: Wallpaper): void {
		this.#library.choose(wallpaper);
	}

	/**
	 * Hand the picture's colours to a group.
	 *
	 * ⚠️ The lighting only. The wallpaper is not set, because nothing here can
	 * set one yet — and doing half of it silently would be worse than doing
	 * half of it out loud.
	 */
	protected async apply(group: GroupId): Promise<void> {
		const ambience = this.preview();
		if (!ambience) return;

		await this.#store.setGroupAmbience(group, ambience);
	}
}
