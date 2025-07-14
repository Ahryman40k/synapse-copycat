import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { BackendApi } from "@synapse-copycat/backend-api";

@Component({
	selector: "dashboard-page",
	templateUrl: "./dashboard-page.html",
	styleUrl: "./dashboard-page.scss",
	imports: [CommonModule],
})
export class DashboardPage {
	private readonly api = inject(BackendApi);

	protected devices = this.api.invoke("devices", {});
	protected modules = this.api.invoke("modules", {});
}
