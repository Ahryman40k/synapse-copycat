import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * A static surface holding a group of controls.
 *
 * Split out of `Card`, which was doing both jobs: every panel in the
 * application inherited a hover lift and a pointer cursor built for something
 * clickable. A panel is not clickable — it is a container, and the controls
 * inside it are what respond.
 *
 * Use `syn-card` when the whole surface activates something.
 */
@Component({
	selector: 'syn-panel',
	styleUrl: './panel.scss',
	template: '<ng-content />',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Panel {}
