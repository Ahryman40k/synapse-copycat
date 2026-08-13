import { Component } from '@angular/core';
import { Card, CheckboxComponent } from '@synapse-copycat/ui';

@Component({
	selector: 'lighting-switch-off-panel',
	templateUrl: './lighting-switch-off-panel.html',
	styleUrl: './lighting-switch-off-panel.scss',
	imports: [CheckboxComponent, Card],
})
export class LightingSwitchOffPanelComponent {}
