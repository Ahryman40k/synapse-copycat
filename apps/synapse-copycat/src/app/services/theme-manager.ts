import { DOCUMENT } from "@angular/common";
import { Injectable, inject } from "@angular/core";

export const theme = ["default-light-theme", "default-dark-theme"] as const;
export type Theme = (typeof theme)[number];

@Injectable({
	providedIn: "root",
})
export class ThemeService {
	private document: Document = inject(DOCUMENT);
	private _activatedTheme: Theme = "default-light-theme";

	isDarkThemeMatch(theme: string): boolean {
		const match = theme.split("-");
		return match[1] === "dark";
	}

	get activatedTheme() {
		return this._activatedTheme;
	}

	switchTheme(theme: Theme): void {
		const themeLink = this.document.getElementById(
			"app-theme",
		) as HTMLLinkElement;
		const body = this.document.querySelector("body") as HTMLElement;

		if (themeLink) {
			body.setAttribute(
				"data-theme",
				this.isDarkThemeMatch(theme) ? "dark" : "light",
			);
			themeLink.href = `/assets/themes/${theme}.css`;
			this._activatedTheme = theme;
		}
	}

	isDarkTheme(): boolean {
		return this.activatedTheme === "default-dark-theme";
	}
}
