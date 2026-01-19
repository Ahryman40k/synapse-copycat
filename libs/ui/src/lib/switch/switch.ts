import { ChangeDetectionStrategy, Component, model } from '@angular/core';

@Component({
  selector: 'syn-switch, label[syn-switch]',
  styleUrl: './switch.scss',
  templateUrl: './switch.html',
  host: {
    '[class.switch]': 'true',
    '(click)': 'toggleState()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SwitchComponent {
  state = model(false);

  toggleState() {
    const state = this.state();
    this.state.set(!state);
  }
}
