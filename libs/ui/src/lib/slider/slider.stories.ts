import { Component, input } from '@angular/core';
import {
	argsToTemplate,
	type Meta,
	moduleMetadata,
	type StoryObj,
} from '@storybook/angular';
import { SliderComponent } from './slider';

@Component({
	selector: 'syn-slider-story-host',

	imports: [SliderComponent],
	template: `
        <syn-slider [value]="value()" [min]="min()" [max]="max()" (valueChange)="valueChange($event)"></syn-slider>
        <p>Selected value: {{ result }}</p>
    `,
	styles: `
  :host {
    width: 100%;
    height: 100px;
  }
`,
})
export class vHolderComponent {
	min = input.required<number>();
	max = input.required<number>();
	value = input.required<number>();
	result = 0;

	valueChange(value: number): void {
		this.result = value;
	}
}

const meta: Meta<SliderComponent> = {
	component: SliderComponent,
	title: 'UI library / Slider',

	decorators: [
		moduleMetadata({
			imports: [vHolderComponent],
		}),
	],
};

export default meta;
type Story = StoryObj<SliderComponent>;

export const Default: Story = {
	args: {},
};

export const full: Story = {
	args: {
		value: 25,
		min: 20,
		max: 35,
	},
	render: (args) => ({
		props: {
			...args,
		},
		template: `
      <syn-slider-story-host ${argsToTemplate(args)} ></syn-slider-story-host>
`,
	}),
};
