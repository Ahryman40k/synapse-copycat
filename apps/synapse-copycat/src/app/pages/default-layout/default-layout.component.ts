import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Route, RouterModule } from '@angular/router';
import { WelcomePageComponent } from '../welcome-page/welcome-page.component';
import { PageBarComponent } from '../../shared/page-bar/page-bar.component';
import { MousematPageComponent } from '../mousemat-page/mousemat-page.component';
import { MousePageComponent } from '../mouse-page/mouse-page.component';
import { AccessoryPageComponent } from '../accessory-page/accessory-page.component';
import { KeyboardPageComponent } from '../keyboard-page/keyboard-page.component';
import { StreamingPageComponent } from '../streaming-page/streaming-page.component';

export const routes: Route[] = [
  { path: '', redirectTo: 'welcome', pathMatch: 'full' },
  { path: 'welcome', component: WelcomePageComponent },
  {
    path: 'device',
    children: [
      {
        path: 'mousemat',
        component: MousematPageComponent,
      },
      {
        path: 'mouse',
        component: MousePageComponent,
      },
      {
        path: 'keyboard',
        component: KeyboardPageComponent,
      },
      {
        path: 'accessory',
        component: AccessoryPageComponent,
      },
      {
        path: 'streaming',
        component: StreamingPageComponent,
      },
    ],
  },
];

@Component({
  selector: 'synapse-copycat-default-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, PageBarComponent],
  templateUrl: './default-layout.component.html',
  styleUrls: ['./default-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DefaultLayoutComponent {}
