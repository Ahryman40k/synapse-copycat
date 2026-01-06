import { Component } from '@angular/core';
import { DefaultLayout } from './core/layout/default-layout/default-layout';

@Component({
  imports: [DefaultLayout],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
