import { Dialog } from '@angular/cdk/dialog';
import { Component, inject, signal } from '@angular/core';
import { moduleMetadata } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { NewGroupDialog } from './new-group-dialog';

/**
 * Opened the way the dashboard opens it — through the CDK's `Dialog`, into the
 * overlay container. A story rendering the component on its own would show the
 * form but none of what makes it a dialog.
 */
@Component({
	selector: 'new-group-dialog-story-host',
	template: `
		<button type="button" (click)="ask()">New group</button>
		<pre data-testid="answer">{{ answer() }}</pre>
	`,
})
export class NewGroupDialogStoryHost {
	readonly #dialog = inject(Dialog);
	readonly answer = signal('—');

	ask(): void {
		this.#dialog
			.open<string | undefined>(NewGroupDialog, {
				panelClass: 'syn-dialog-panel',
				ariaLabel: 'New group',
			})
			.closed.subscribe((name) => this.answer.set(name ?? 'cancelled'));
	}
}

const meta: Meta<NewGroupDialog> = {
	// No .mdx beside this one, so Storybook generates the docs page.
	tags: ['autodocs'],
	component: NewGroupDialog,
	title: 'Synapse application / Components / new group dialog',
	decorators: [moduleMetadata({ imports: [NewGroupDialogStoryHost] })],
	render: () => ({ template: '<new-group-dialog-story-host />' }),
};
export default meta;

type Story = StoryObj<NewGroupDialog>;

const overlay = () => within(document.body);

export const Naming: Story = {
	name: 'Naming a group',
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await userEvent.click(canvas.getByRole('button', { name: 'New group' }));

		const field = await overlay().findByRole('textbox', {
			name: 'Group name',
		});
		// Nothing to make yet, so there is nothing to press.
		await expect(
			overlay().getByRole('button', { name: 'Create' }),
		).toBeDisabled();

		await userEvent.type(field, 'Desk');
		await userEvent.click(overlay().getByRole('button', { name: 'Create' }));

		await waitFor(async () => {
			await expect(canvas.getByTestId('answer')).toHaveTextContent('Desk');
		});
	},
};

export const Cancelling: Story = {
	name: 'Changing your mind',
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await userEvent.click(canvas.getByRole('button', { name: 'New group' }));
		await overlay().findByRole('textbox', { name: 'Group name' });

		await userEvent.type(
			overlay().getByRole('textbox', { name: 'Group name' }),
			'Desk',
		);
		await userEvent.click(overlay().getByRole('button', { name: 'Cancel' }));

		// Not the name typed: cancelling is not a quieter way of confirming.
		await waitFor(async () => {
			await expect(canvas.getByTestId('answer')).toHaveTextContent('cancelled');
		});
	},
};
