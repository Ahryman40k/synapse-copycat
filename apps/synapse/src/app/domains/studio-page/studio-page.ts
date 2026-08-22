import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import type { Ambience } from '@synapse-copycat/backend-api';
import { still } from '@synapse-copycat/backend-api';
import { Panel } from '@synapse-copycat/ui';
import { AmbiencePanel } from '../../core/components/ambience-panel/ambience-panel';
import { AmbiencePreview } from '../../core/components/ambience-preview/ambience-preview';

/**
 * Where a new colour source is authored.
 *
 * **The point is to add to the colour list, not to fill in a form.** Colour is
 * a closed set today — one colour, or a rainbow — and every ambience in the
 * application has to be built out of those two. What is authored here becomes a
 * third entry, choosable on any group card like the built-in ones.
 *
 * ⚠️ **Colour only.** It does not drive motion and it does not drive
 * brightness, and that is not a limitation — it is what the three channels are
 * for. A source written here composes with every wave, every pulse and every
 * brightness that already exists, and with the ones added later, without
 * knowing about any of them. An effect that decided all three would be a fourth
 * kind of thing that only works alone.
 *
 * ⚠️ **What is on the page today is a bench, not the studio.** The three
 * existing channels, previewed at a size where a wave can actually be judged —
 * useful, and not what the page is for. Authoring needs two things that do not
 * exist: a way to express a colour source that is neither of the two built-in
 * ones, and somewhere for the backend to keep it. Neither is designed, and an
 * interface for saving something the next restart forgets would be worse than
 * saying so.
 */
@Component({
	selector: 'studio-page',
	templateUrl: './studio-page.html',
	styleUrl: './studio-page.scss',
	imports: [AmbiencePanel, AmbiencePreview, Panel],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioPage {
	protected readonly ambience = signal<Ambience>(still('#00ff00'));

	protected onAmbience(ambience: Ambience): void {
		this.ambience.set(ambience);
	}
}
