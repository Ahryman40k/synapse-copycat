import { HexColor } from '@synapse-copycat/ui';
import {
	array,
	type InferOutput,
	object,
	pipe,
	minLength,
	string,
} from 'valibot';

/**
 * An image in the chosen folder, with the colours in it.
 *
 * The mirror of `wallpapers::Wallpaper` on the Rust side.
 *
 * ⚠️ The thumbnail is a `data:` URI, not a path. The webview cannot read an
 * arbitrary path without opening the asset protocol to the whole filesystem,
 * and the browser path has no filesystem at all — one shape works in both. The
 * *path* is carried too, because that is what a desktop's wallpaper setter
 * needs, and it is shown to nobody.
 */
export const Wallpaper = object({
	path: string(),
	name: string(),
	thumbnail: string(),
	/**
	 * Ordered by hue, because they are laid *along* a device: neighbours here
	 * are neighbours on the strip. At least one — an image with no colour in it
	 * is not an image.
	 */
	palette: pipe(array(HexColor), minLength(1)),
});
export type Wallpaper = InferOutput<typeof Wallpaper>;

/**
 * One wallpaper setter this machine could use — the mirror of
 * `wallpapers::WallpaperSetter`.
 *
 * ⚠️ An empty *list* of these is a real answer and not a failure; an entry with
 * no name is not, which is the difference this schema draws.
 */
export const WallpaperSetter = object({
	/** `GNOME`, `swww` — shown to the reader. */
	name: pipe(string(), minLength(1)),
	/** The program it drives, so a reader can tell why it is or is not there. */
	program: string(),
});
export type WallpaperSetter = InferOutput<typeof WallpaperSetter>;
