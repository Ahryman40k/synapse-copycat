import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
	PageBarComponent,
	type PageBarDescriptor,
} from '../../page-bar/page-bar';
import { MousematLightingPanelComponent } from './lighting/mousemat-lighting';

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
}
