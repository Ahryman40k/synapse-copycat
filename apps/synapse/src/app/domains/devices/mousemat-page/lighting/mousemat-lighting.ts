import { Component, model } from '@angular/core';
import {
  BrightnessChange,
  BrightnessPanelComponent,
} from '../../../../core/components/brightness-panel/brightness-panel';
import { EffectsPanel } from '../../../../core/components/effects-panel/effects-panel';
import { LightingSwitchOffPanelComponent } from '../../../../core/components/lighting-switch-off-panel/lighting-switch-off-panel';

@Component({
  selector: 'mousemat-lighting-panel',
  styleUrl: './mousemat-lighting.scss',
  templateUrl: './mousemat-lighting.html',
  imports: [
    BrightnessPanelComponent,
    LightingSwitchOffPanelComponent,
    EffectsPanel,
  ],
})
export class MousematLightingPanelComponent {
  brightness = model<BrightnessChange>({ value: 0, activated: true });

  onBrightnessChange(change: BrightnessChange): void {
    this.brightness.set(change);
  }
}
