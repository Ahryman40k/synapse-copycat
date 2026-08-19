import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Panel } from '@synapse-copycat/ui';

/** Where the source lives. */
export const PROJECT_URL = 'https://github.com/Ahryman40k/synapse-copycat';

@Component({
	selector: 'about-panel',
	templateUrl: './about-panel.html',
	styleUrl: './about-panel.scss',
	imports: [Panel],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPanel {
	protected readonly projectUrl = PROJECT_URL;

	/**
	 * ⚠️ Nothing supplies this. `tauri.conf.json` carries a version and
	 * `package.json` says `0.0.0`, but neither reaches the browser bundle, so
	 * there is no honest number to show — and a wrong one is worse than none.
	 */
	readonly version = input<string | undefined>(undefined);
}
