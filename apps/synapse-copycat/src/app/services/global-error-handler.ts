import { ErrorHandler, inject } from "@angular/core";
import { Router } from "@angular/router";

export class GlobalErrorHandlerService implements ErrorHandler {
	private readonly _router = inject(Router);

	handleError(error: any): void {
		console.log(`URL: ${this._router.url}`);
		console.log(error);
	}
}
