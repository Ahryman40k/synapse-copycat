import { Component, input } from '@angular/core';
import {
	argsToTemplate,
	type Meta,
	moduleMetadata,
	type StoryObj,
} from '@storybook/angular';
import { SwitchComponent } from './switch';

@Component({
	selector: 'syn-switch-story-host',

	imports: [SwitchComponent],
	template: `
        <syn-switch [state]="state()" (stateChange)="valueChange($event)"></syn-switch>
        <p>Selected value: {{result}}</p>
    `,
	styles: `
  :host {
    width: 100%;
    height: 100px;
  }
`,
})
export class vHolderComponent {
	state = input.required<number>();
	result = false;

	valueChange(value: boolean): void {
		this.result = value;
	}
}

const meta: Meta<SwitchComponent> = {
	component: SwitchComponent,
	title: 'UI library / Switch',

	decorators: [
		moduleMetadata({
			imports: [vHolderComponent],
		}),
	],
};

export default meta;
type Story = StoryObj<SwitchComponent>;

export const Default: Story = {};

export const Full: Story = {
	args: {
		state: true,
	},
	render: (args) => ({
		props: args,
		template: `<syn-switch-story-host ${argsToTemplate(args)}> </syn-switch-story-host>`,
	}),
};
