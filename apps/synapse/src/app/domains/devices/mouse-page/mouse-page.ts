import { NgComponentOutlet } from '@angular/common';
import { Component } from '@angular/core';
import {
	PageBarComponent,
	type PageBarDescriptor,
} from '../../page-bar/page-bar';
import { MouseCustomizePanelComponent } from './customize/mouse-customize';
import { MouseLightingPanelComponent } from './lighting/mouse-lighting';

@Component({
	selector: 'mouse-page',
	styleUrl: './mouse-page.scss',
	templateUrl: './mouse-page.html',
	imports: [PageBarComponent, NgComponentOutlet],
})
export class MousePageComponent {
	descriptor: PageBarDescriptor = [
		{
			title: 'customize',
			component: MouseCustomizePanelComponent,
		},
		{
			title: 'performance',
			component: MouseLightingPanelComponent,
		},
		{
			title: 'lighting',
			component: MouseLightingPanelComponent,
		},
		{
			title: 'calibration',
			component: MouseLightingPanelComponent,
		},
		{
			title: 'power',
			component: MouseLightingPanelComponent,
		},
	];
}
