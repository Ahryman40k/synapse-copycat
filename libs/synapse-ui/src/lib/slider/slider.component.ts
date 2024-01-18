import { Component, HostBinding, Input } from '@angular/core';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'synapse-slider',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './slider.component.html',
  styleUrl: './slider.component.scss',
})
export class SliderComponent {

  @HostBinding('class.synapse-slider') get componentClass() { return true }

  @Input() min = 0;

  @Input() max = 100;

  @Input() value = this.min;

  @Input() disabled = false;

  onValueChanged($event: any) {
    this.value = $event.target.valueAsNumber
  }
}
