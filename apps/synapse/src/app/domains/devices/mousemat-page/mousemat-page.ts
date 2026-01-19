import { Component, inject, input } from '@angular/core';
import { BackendApi, type Device } from '@synapse-copycat/backend-api';
import {
  DescriptorItem,
  PageBarComponent,
  PageBarDescriptor,
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

  readonly #backend = inject(BackendApi);

  selectedPanel = this.descriptor[0];

  onPanelChanging(item: DescriptorItem): void {
    this.selectedPanel = item;
  }
}
