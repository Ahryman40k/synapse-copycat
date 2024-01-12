import { Component, Input, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { deviceGroupSelector } from '../../actions';
import { DeviceCardComponent } from '../../shared/device-card/device-card.component';
import { Router } from '@angular/router';
import { Device } from '../../models';

@Component({
  selector: 'synapse-copycat-welcome-page',
  standalone: true,
  imports: [CommonModule, 
    DeviceCardComponent
  ],
  templateUrl: './welcome-page.component.html',
  styleUrls: ['./welcome-page.component.scss'],
})
export class WelcomePageComponent  {

  private readonly store = inject(Store);
  private readonly router = inject(Router)

  @Input() usb$ = this.store.select(deviceGroupSelector('usb'))
  @Input() connected$ = this.store.select(deviceGroupSelector('connected'))


  activateDevice(device: Device) {
    this.router.navigate(['device', device.kind])
  }
}
