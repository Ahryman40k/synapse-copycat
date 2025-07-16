import { Component } from '@angular/core';
import { DefaultLayout } from './core/layout/default-layout/default-layout';
import { ApplicationStore } from './core/stores/application-store';

@Component({
  imports: [DefaultLayout],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  providers: [
    ApplicationStore
  ]
})
export class App {}
