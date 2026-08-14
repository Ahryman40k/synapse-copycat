import { Component, input } from '@angular/core';
import type { Device } from '@synapse-copycat/backend-api';
import {
	PageBarComponent,
	type PageBarDescriptor,
} from '../../page-bar/page-bar';
import { MousematLightingPanelComponent } from './lighting/mousemat-lighting';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'mousemat-page',
	templateUrl: './mousemat-page.html',
	styleUrl: './mousemat-page.scss',
	imports: [CommonModule, PageBarComponent],
})
export class MousematPageComponent {
	descriptor: PageBarDescriptor = [
		{
			title: 'lighting',
			component: MousematLightingPanelComponent,
		},
	];

	device = input.required<Device>();
}
