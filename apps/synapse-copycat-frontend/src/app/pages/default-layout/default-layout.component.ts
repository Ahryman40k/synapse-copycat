import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Route, RouterModule } from '@angular/router';
import { WelcomePageComponent } from '../welcome-page/welcome-page.component';
import { PageBarComponent } from '../../shared/page-bar/page-bar.component';

export const routes: Route[] = [
  {path: '', redirectTo: 'welcome', pathMatch: 'full'},
  {path: 'welcome', component: WelcomePageComponent},
];


@Component({
  selector: 'synapse-copycat-default-layout',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    PageBarComponent,
  ],
  templateUrl: './default-layout.component.html',
  styleUrls: ['./default-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DefaultLayoutComponent {}
