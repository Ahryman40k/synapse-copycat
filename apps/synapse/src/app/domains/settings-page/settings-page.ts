import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AboutPanel } from '../../core/components/about-panel/about-panel';
import { LanguagePanel } from '../../core/components/language-panel/language-panel';
import type { Language } from '../../core/models/language';
import { ApplicationStore } from '../../core/stores/application-store';

/**
 * The application's own settings, as opposed to a device's.
 *
 * No page bar: a bar exists to choose between sections, and there is one page
 * here. Adding one for a single tab would be furniture.
 */
@Component({
	selector: 'settings-page',
	templateUrl: './settings-page.html',
	styleUrl: './settings-page.scss',
	imports: [LanguagePanel, AboutPanel],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
	readonly #store = inject(ApplicationStore);

	protected readonly language = this.#store.language;

	protected onLanguageChange(language: Language): void {
		this.#store.setLanguage(language);
	}
}
