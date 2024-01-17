import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { max } from 'rxjs';

@Component({
  selector: 'synpase-slider',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './slider.component.html',
  styleUrl: './slider.component.scss',
})
export class SliderComponent {
  @Input() min = 0;

  @Input() max = 100;

  // @Input({transform: (v) => v < this.min
  //                       ? this.min
  //                       : v >this.max
  //                           ? this.max
  //                           : v
  //                       })
  @Input()
  value = this.min;

  @Input() disabled = false;
}
