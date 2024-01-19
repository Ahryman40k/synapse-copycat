import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CheckboxComponent } from '@synapse/ui';

@Component({
  selector: 'synapse-copycat-lighting-control',
  standalone: true,
  imports: [CommonModule, CheckboxComponent],
  templateUrl: './lighting-control.component.html',
  styleUrl: './lighting-control.component.scss',
})
export class LightingControlComponent {}
