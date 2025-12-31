import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
	selector: 'syn-card',
	imports: [CommonModule],
	styleUrl: './card.scss',
	template: '<ng-content></ng-content>',
})
export class Card {}
