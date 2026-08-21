import { DialogRef } from '@angular/cdk/dialog';
import {
	ChangeDetectionStrategy,
	Component,
	inject,
	signal,
} from '@angular/core';
import { Button, TextField } from '@synapse-copycat/ui';

/**
 * What a new group needs before it can exist: a name.
 *
 * Only a name, on purpose. Members and an ambience are both easier to choose
 * against something that is already on screen — a form asking for all three at
 * once would be answered by guessing, and every answer is one gesture away on
 * the card this produces.
 *
 * Opened through the CDK's `Dialog` and answered through `DialogRef.close`, so
 * there is no open/closed flag shared with the caller. That is what makes it
 * impossible to get into the state a two-way bound dialog can reach, where the
 * caller and the dialog disagree about whether it is showing.
 */
@Component({
	selector: 'new-group-dialog',
	templateUrl: './new-group-dialog.html',
	styleUrl: './new-group-dialog.scss',
	imports: [Button, TextField],
	host: {
		role: 'dialog',
		'aria-modal': 'true',
		'aria-label': 'New group',
	},
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewGroupDialog {
	readonly #ref = inject<DialogRef<string | undefined>>(DialogRef);

	protected readonly name = signal('');

	protected onSubmit(event: Event): void {
		event.preventDefault();

		const name = this.name().trim();
		// The submit button is disabled without one, so this only catches the
		// paths that bypass it.
		if (!name) return;

		this.#ref.close(name);
	}

	protected cancel(): void {
		this.#ref.close(undefined);
	}
}
