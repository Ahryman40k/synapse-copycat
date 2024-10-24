import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrightnessControlComponent } from '../../shared/brightness-control/brightness-control.component';
import { LightingControlComponent } from '../../shared/lighting-control/lighting-control.component';
import { PageBarComponent, TabDescriptor } from '../../shared/page-bar/page-bar.component';

@Component({
  selector: 'synapse-copycat-mousemat-page',
  standalone: true,
  imports: [CommonModule, PageBarComponent, BrightnessControlComponent, LightingControlComponent],
  templateUrl: './mousemat-page.component.html',
  styleUrl: './mousemat-page.component.scss',
})
export class MousematPageComponent {
  readonly tabDescriptors: TabDescriptor[] = [
    {
      title: "lighting",
      component: BrightnessControlComponent
    }
  ]
}
