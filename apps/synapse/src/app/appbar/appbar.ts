import { input, Component, output } from '@angular/core';
import type { Device, Module } from '@synapse-copycat/backend-api';

@Component({
  selector: 'syn-bar, nav[synapse-bar]',
  templateUrl: './appbar.html',
  styleUrl: './appbar.scss',
})
export class AppBar {
  devices = input.required<Device[]>();
  modules = input.required<Module[]>();

  deviceActivated = output<Device>()
  moduleActivated = output<Module>()
  homeRequested = output<void>()

  goHome() {
    this.homeRequested.emit()
  }

  activateDevice(device: Device) {
    this.deviceActivated.emit(device)
  }

  activateModule(module: Module) {
    this.moduleActivated.emit(module)
  }

}
