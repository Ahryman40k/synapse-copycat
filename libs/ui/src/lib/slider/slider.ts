import {
	Component,
	computed,
	ElementRef,
	inject,
	input,
	model,
	viewChild,
} from '@angular/core';

@Component({
	selector: 'syn-slider, input[type=range]',
	templateUrl: './slider.html',
	styleUrl: './slider.scss',
	host: {
		// '(resize)': 'onresize($event)',
	},
})
export class SliderComponent {
	el = inject(ElementRef<HTMLElement>);

	inputRange = viewChild<ElementRef<HTMLInputElement>>('inputRange');
	thumbLabel = viewChild('thumbLabel');

	min = input<number>(0);
	max = input<number>(100);

	value = model(0);

	position = computed(() => {
		const value = this.value();
		const min = this.min();
		const max = this.max();

		// const width = this.el.nativeElement.offsetWidth;

		// console.log(value, min, max, this.el.nativeElement.offsetWidth);

		const thumbWidth = 32;
		const percent = (value - min) / (max - min);

		const input = this.inputRange();

		return !input
			? 0
			: percent * (input.nativeElement.offsetWidth - thumbWidth) +
					thumbWidth / 2;
	});

	onValueChanged($event: Event): void {
		if (!$event.target) return;

		if ($event.target instanceof HTMLInputElement) {
			const { valueAsNumber } = $event.target;
			this.value.set(valueAsNumber || 0);
		}
	}

	// onResize(event: any): void {
	//   const value = this.value();
	//   this.value.set(value);
	// }
}
