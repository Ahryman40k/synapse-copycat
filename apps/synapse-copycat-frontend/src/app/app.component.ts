
import { Component, inject, OnInit } from '@angular/core';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { DefaultLayoutComponent } from './pages/default-layout/default-layout.component';
import { Store } from '@ngrx/store';
import { getConnectedDevices, getUsbDevices } from './actions/devices.actions';

@Component({
  standalone: true,
  imports: [
    NavbarComponent,
    DefaultLayoutComponent
  ],
  selector: 'synapse-copycat-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  title = 'synapse-copycat-frontend';

  private store = inject(Store)

  ngOnInit(): void {
      this.store.dispatch( getUsbDevices() );
      this.store.dispatch( getConnectedDevices() );
  }

}
