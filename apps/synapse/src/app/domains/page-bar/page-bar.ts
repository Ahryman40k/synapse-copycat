import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type Type,
} from '@angular/core';

export type DescriptorItem = {
  title: string;
  component: Type<any>;
};
export type PageBarDescriptor = DescriptorItem[];

@Component({
  selector: 'page-bar',
  styleUrl: './page-bar.scss',
  templateUrl: './page-bar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageBarComponent {
  descriptor = input.required<PageBarDescriptor>();

  panelChanging = output<DescriptorItem>();

  selectItem(item: DescriptorItem): void {
    this.panelChanging.emit(item);
  }
}
