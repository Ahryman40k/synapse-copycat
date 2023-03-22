import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { connectedSelector, usbSelector } from '../../actions';

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

  readonly usb$ = this.store.select(usbSelector)
  readonly connected$ = this.store.select(connectedSelector)


}
