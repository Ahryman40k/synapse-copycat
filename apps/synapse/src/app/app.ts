import { Component, inject, OnInit } from '@angular/core';
import { DefaultLayout } from './core/layout/default-layout/default-layout';
import { ApplicationStore } from './core/stores/application-store';

@Component({
  imports: [DefaultLayout],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  readonly #store = inject(ApplicationStore);

  ngOnInit(): void {
    this.#store.getDevices();
    this.#store.getModules();
  }
}
