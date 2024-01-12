import { Component, Input, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { deviceGroupSelector } from '../../actions';
import { DeviceCardComponent } from '../../shared/device-card/device-card.component';

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

  readonly store = inject(Store);

  @Input() usb$ = this.store.select(deviceGroupSelector('usb'))
  @Input() connected$ = this.store.select(deviceGroupSelector('connected'))


}
