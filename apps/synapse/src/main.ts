import { bootstrapApplication } from "@angular/platform-browser";
import { makeAppConfig } from "./app/app.config";
import { App } from "./app/app";
import { ApplicationConfig } from "./app/models/config";
import { safeParse } from "valibot";

fetch("/config/app.json")
	.then((res) => res.json())
	.then((maybeConfig: any) => {
		const validation = safeParse(ApplicationConfig, maybeConfig);
		if (validation.success) {
			bootstrapApplication(App, makeAppConfig(validation.output)).catch((err) =>
				console.error(err),
			);
		} else {
			console.error("APPLICATION CONFIG NOT FOUND");
		}
	});
// bootstrapApplication(App, appConfig).catch((err) => console.error(err));
