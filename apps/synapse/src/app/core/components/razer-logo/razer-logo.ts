import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The Razer mark, painted by the theme rather than by the file.
 *
 * The two shapes map onto the two roles that belong together: the disc takes
 * `primary`, the snake takes `on-primary` — the pair the palette measures for
 * contrast, so the mark stays readable whatever colour a device reports.
 */
@Component({
	selector: 'razer-logo',
	templateUrl: './razer-logo.html',
	styleUrl: './razer-logo.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RazerLogo {}
