import { NgComponentOutlet } from '@angular/common';
import { Component } from '@angular/core';
import { KeyboardLightingSection } from './lighting/keyboard-lighting';
import {
	PageBarComponent,
	type PageBarDescriptor,
} from '../../page-bar/page-bar';
import { KeyboardCustomizeSection } from './customize/keyboard-customize';

@Component({
	selector: 'keyboard-page',
	templateUrl: './keyboard-page.html',
	styleUrl: './keyboard-page.scss',
	imports: [PageBarComponent, NgComponentOutlet],
})
export class KeyboardPageComponent {
	descriptor: PageBarDescriptor = [
		{
			title: 'customize',
			component: KeyboardCustomizeSection,
		},
		{
			title: 'lighting',
			component: KeyboardLightingSection,
		},
	];
}
