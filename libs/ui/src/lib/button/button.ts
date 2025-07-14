import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";

@Component({
	selector: "button[synapse-button], synapse-button",
	imports: [CommonModule],
	styleUrl: "./button.scss",
	template: "<ng-content></ng-content>",
})
export class Button {}
