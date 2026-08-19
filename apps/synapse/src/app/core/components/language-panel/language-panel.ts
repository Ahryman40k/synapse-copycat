import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { Panel, Select } from '@synapse-copycat/ui';
import {
	type Language,
	LANGUAGE_DEFAULT,
	LANGUAGES,
} from '../../models/language';

@Component({
	selector: 'language-panel',
	templateUrl: './language-panel.html',
	styleUrl: './language-panel.scss',
	imports: [Panel, Select],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguagePanel {
	readonly language = model<Language>(LANGUAGE_DEFAULT);

	protected readonly languages = LANGUAGES;

	protected onChange(value: string | undefined): void {
		if (value) this.language.set(value as Language);
	}
}
