import {
  ChangeDetectionStrategy,
  Component,
  Input,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Device } from '../../models';

@Component({
  selector: 'synapse-copycat-device-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './device-card.component.html',
  styleUrls: ['./device-card.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceCardComponent {
  @Input() device?: Device;
}
