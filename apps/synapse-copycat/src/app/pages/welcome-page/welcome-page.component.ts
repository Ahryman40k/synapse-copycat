import { Component, Input, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { deviceGroupSelector } from '../../actions';

@Component({
  selector: 'synapse-copycat-welcome-page',
  standalone: true,
  imports: [CommonModule, 
    
  ],
  templateUrl: './welcome-page.component.html',
  styleUrls: ['./welcome-page.component.scss'],
})
export class WelcomePageComponent  {

  readonly store = inject(Store);

  @Input() usb$ = this.store.select(deviceGroupSelector('usb'))
  @Input() connected$ = this.store.select(deviceGroupSelector('connected'))


}
