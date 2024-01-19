import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SliderComponent, ToggleComponent } from '@synapse/ui';

@Component({
  selector: 'synapse-copycat-brightness-control',
  standalone: true,
  imports: [CommonModule, SliderComponent, ToggleComponent],
  templateUrl: './brightness-control.component.html',
  styleUrl: './brightness-control.component.scss',
})
export class BrightnessControlComponent {
  @ViewChild('slider') slider!: SliderComponent;

  toggleChanged(state: boolean) {
    this.slider.disabled = state;
  }
}
