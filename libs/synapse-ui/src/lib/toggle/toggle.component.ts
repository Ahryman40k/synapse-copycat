import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostBinding,
  Input,
  Output,
  booleanAttribute,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'synapse-toggle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toggle.component.html',
  styleUrl: './toggle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToggleComponent {
  @HostBinding('class.synapse-toggle') private get componentClass() {
    return !this.disabled;
  }

  @HostBinding('class.synapse-toggle-disabled') private get getDisabled() {
    return this.disabled;
  }

  private readonly _changeDetectorRef = inject(ChangeDetectorRef);

  _checked = false;

  @Input() disabled = false;

  @Input({ transform: booleanAttribute })
  set checked(value: boolean) {
    if (!this.disabled) {
      this._checked = value;
      this.onCheckChanged.emit(this._checked);
      this._changeDetectorRef.markForCheck();
    }
  }

  @Output() onCheckChanged = new EventEmitter<boolean>();

  toggle() {
    this._checked = !this._checked;
    this.onCheckChanged.emit(this._checked);
  }
}
