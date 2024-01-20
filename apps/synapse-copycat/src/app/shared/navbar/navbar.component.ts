import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  featherX,
  featherSquare,
  featherMinimize2,
  featherSettings,
} from '@ng-icons/feather-icons';
import { Device } from '../../models';

@Component({
  selector: 'synapse-copycat-navbar',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({
      featherX,
      featherSquare,
      featherMinimize2,
      featherSettings,
    }),
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class NavbarComponent {
  @Input() usb: Device[] = [];
  @Input() connected: Device[] = [];

  @Output() DeviceActivated = new EventEmitter<Device>();
  @Output() GoHome = new EventEmitter<void>();

  showDevicePage(device: Device): void {
    this.DeviceActivated.emit(device);
  }

  goHome(): void {
    this.GoHome.emit();
  }
}
