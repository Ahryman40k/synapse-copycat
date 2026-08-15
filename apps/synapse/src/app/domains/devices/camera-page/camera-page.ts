import { NgComponentOutlet } from '@angular/common';
import { Component } from '@angular/core';
import {
	PageBarComponent,
	type PageBarDescriptor,
} from '../../page-bar/page-bar';
import { CameraCustomizeSection } from './customize/camera-customize';

/**
 * The Kiyo's page. Reached by `device/streaming/:id`, because `streaming` is
 * the kind the contract carries for this line — there is no `camera` kind.
 *
 * One section for now. The bar stays, so a second one costs a line.
 */
@Component({
	selector: 'camera-page',
	templateUrl: './camera-page.html',
	styleUrl: './camera-page.scss',
	imports: [PageBarComponent, NgComponentOutlet],
})
export class CameraPageComponent {
	descriptor: PageBarDescriptor = [
		{
			title: 'customize',
			component: CameraCustomizeSection,
		},
	];
}
