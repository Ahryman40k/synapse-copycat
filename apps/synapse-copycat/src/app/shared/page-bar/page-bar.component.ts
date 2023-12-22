import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'synapse-copycat-page-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-bar.component.html',
  styleUrls: ['./page-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageBarComponent {}
