import { Component, inject, OnInit } from '@angular/core';
import { ApplicationStore } from '../core/stores/application-store';

@Component({
  selector: 'dashboard-page',
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  imports: [],
})
export class DashboardPage implements OnInit {
  readonly #store = inject(ApplicationStore);

  protected devices = this.#store.devices
  protected modules = this.#store.modules;

  ngOnInit(): void {
    this.#store.getDevices()
      this.#store.getModules();
  }
}
