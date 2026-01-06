import { Component } from '@angular/core';
import { Card, SliderComponent, SwitchComponent } from '@synapse-copycat/ui';

@Component({
  selector: 'brightness-panel',
  templateUrl: './brightness-panel.html',
  styleUrl: './brightness-panel.scss',
  imports: [Card, SwitchComponent, SliderComponent],
})
export class BrightnessPanelComponent { }
