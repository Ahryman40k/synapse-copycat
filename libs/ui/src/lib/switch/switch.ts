import {
	ChangeDetectionStrategy,
	Component,
	input,
	model,
	output,
} from '@angular/core';

@Component({
	selector: 'syn-switch, label[syn-switch]',
	styleUrl: './switch.scss',
	templateUrl: './switch.html',
	host: {
		'[class.switch]': 'true',
		'(click)': 'toggleState()',
	},
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SwitchComponent {
	checked = input<boolean>(false);
	change = output<boolean>();

	state = model(this.checked());

	toggleState() {
		const state = this.state();
		this.state.set(!state);
	}
}
