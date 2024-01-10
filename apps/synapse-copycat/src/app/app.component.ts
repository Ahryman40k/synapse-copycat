import { Component, inject, OnInit } from '@angular/core';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { DefaultLayoutComponent } from './pages/default-layout/default-layout.component';
import { Store } from '@ngrx/store';
import { getDevices } from './actions/devices.actions';
import { deviceGroupSelector } from './actions';
import { Device } from './models';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NavbarComponent,
    DefaultLayoutComponent,
  ],
  selector: 'synapse-copycat-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  title = 'synapse-copycat-frontend';

  private readonly store = inject(Store);

  readonly usb$ = this.store.select(deviceGroupSelector('usb'));
  readonly connected$ = this.store.select(deviceGroupSelector('connected'));

  ngOnInit(): void {
    this.store.dispatch(getDevices());
  }

  activateDevice(device: Device): void {}
}
