import { Component } from '@angular/core';
import { BrightnessPanelComponent } from 'apps/synapse/src/app/core/components/brightness-panel/brightness-panel';
import { LightingSwitchOffPanelComponent } from 'apps/synapse/src/app/core/components/lighting-switch-off-panel/lighting-switch-off-panel';

@Component({
  selector: 'mouse-lighting-panel',
  styleUrl: './mouse-lighting.scss',
  templateUrl: './mouse-lighting.html',
  imports: [BrightnessPanelComponent, LightingSwitchOffPanelComponent],
})
export class MouseLightingPanelComponent { }
