import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Panel } from '@synapse-copycat/ui';

/**
 * Wallpapers, the colours in them, and the groups they drive.
 *
 * Three parts, and the middle one is what makes it worth having:
 *
 * 1. **A library of images** — a folder the user points at.
 * 2. **The colours in each** — a handful pulled out of the picture, not one
 *    average, which on most photographs is mud.
 * 3. **Applied to a group** — the wallpaper is set *and* the lighting takes a
 *    colour from it, so the desk and the display agree.
 *
 * Only the third step touches anything that already exists: a group's ambience
 * takes a fixed colour today, and handing it one is a call that is already
 * written.
 *
 * ⚠️ **Nothing is wired**, and the hard part is not the interface. Setting a
 * wallpaper on Linux means driving whatever the user's desktop uses, and there
 * is no common way in:
 *
 * - **GNOME** — `gsettings set org.gnome.desktop.background picture-uri`, and
 *   `picture-uri-dark` separately, or a light theme keeps the old one.
 * - **KDE Plasma** — no setting to write. It takes a Plasma script over DBus,
 *   evaluated by the shell.
 * - **XFCE** — `xfconf-query`, once per monitor and per workspace, because the
 *   property path contains both.
 * - **swww, hyprpaper** and the other daemons used with tiling window managers
 *   — their own client, or their own socket, and each one different.
 *
 * So this is a set of adapters, not a call. Whichever land will say which ones
 * were found on the machine rather than offering one control that silently does
 * nothing on three desktops out of four.
 */
@Component({
	selector: 'backgrounds-page',
	templateUrl: './backgrounds-page.html',
	styleUrl: './backgrounds-page.scss',
	imports: [Panel],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackgroundsPage {}
