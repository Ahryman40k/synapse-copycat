import {
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
})
export class ToggleComponent {

  private readonly _changeDetectorRef = inject(ChangeDetectorRef);

  private _checked: boolean = false;

  @Input({ transform: booleanAttribute })
  get checked(): boolean {
    return this._checked;
  }
  set checked(value: boolean) {
    this._checked = value;
    this._changeDetectorRef.markForCheck();
  }


  @Input() disabled: boolean = false;

  @Output() onCheckChanged = new EventEmitter<boolean>();
}
