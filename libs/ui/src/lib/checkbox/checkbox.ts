import { CommonModule } from '@angular/common';
import { Component, model } from '@angular/core';

@Component({
  selector: 'syn-checkbox',
  imports: [CommonModule],
  styleUrl: './checkbox.scss',
  templateUrl: './checkbox.html',
  host: {
    '(click)': 'toggle()',
  },
})
export class CheckboxComponent {
  state = model(false);

  toggle(): void {
    const state = this.state();
    this.state.set(!state);
  }
}
