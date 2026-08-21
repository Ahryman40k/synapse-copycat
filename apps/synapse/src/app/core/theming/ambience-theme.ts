import { effect, inject, Injectable } from '@angular/core';
import type { Ambience } from '@synapse-copycat/backend-api';
import { at, composeStrip } from '@synapse-copycat/backend-api';
import { DEFAULT_SOURCE, ThemeService } from '@synapse-copycat/ui';
import { ApplicationStore } from '../stores/application-store';

/**
 * The one colour an ambience contributes to the interface.
 *
 * **Only the colour channel is read, and that is what makes the animated case
 * simple.** The palette takes hue and chroma from this and nothing else —
 * lightness always comes from the tone ladder, which is what keeps text above
 * the contrast floor whatever the hardware reports. Motion and brightness carry
 * only intensity, so a wave of green is still green here, and a pulse does not
 * make the interface breathe. Both are neutralised explicitly below rather than
 * ignored by omission, so the rule is visible in the code.
 *
 * The compositor answers the question rather than a second copy of the same
 * maths: one column, at the start, with nothing dimming it.
 *
 * ⚠️ **A rainbow has no single colour**, and this returns the hue its wheel
 * starts at. Two alternatives were weighed and lost: sampling it live means
 * recomputing an OKLCH palette and rewriting eighteen custom properties every
 * frame, with every border and every label crawling through the spectrum as
 * you read; and averaging the wheel gives grey, which renders as an interface
 * that looks broken rather than colourful.
 */
export function themeSourceOf(ambience: Ambience | undefined): string {
	if (!ambience) return DEFAULT_SOURCE;

	return composeStrip(
		{
			colour: ambience.colour,
			motion: { type: 'none' },
			brightness: { type: 'fixed', level: 1 },
		},
		1,
		at(0),
	)[0];
}

/**
 * Ties the interface's colour to what the first group is showing.
 *
 * ⚠️ The **first** group, which is a placeholder. Several groups can be running
 * different ambiences at once and only one of them can drive the palette; which
 * one is a product question nobody has answered yet. Ordering is the backend's,
 * so this is at least stable across a restart.
 *
 * It follows a stopped group too: the ambience is a choice the user made, and
 * it does not stop being their choice while the group is idle.
 *
 * Instantiated by `DefaultLayout` — a root service with an effect and no
 * injector anywhere does nothing at all.
 */
@Injectable({ providedIn: 'root' })
export class AmbienceTheme {
	readonly #store = inject(ApplicationStore);
	readonly #theme = inject(ThemeService);

	constructor() {
		effect(() => {
			const first = this.#store.groups()[0]?.group.ambience;
			this.#theme.setSource(themeSourceOf(first));
		});
	}
}
