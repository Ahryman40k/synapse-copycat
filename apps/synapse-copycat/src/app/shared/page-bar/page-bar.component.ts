import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentRef } from 'react';

export type TabDescriptor = {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentRef<any>;
};

@Component({
  selector: 'synapse-copycat-page-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-bar.component.html',
  styleUrls: ['./page-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageBarComponent {
  @Input() tabDescriptors: TabDescriptor[] = []
}
