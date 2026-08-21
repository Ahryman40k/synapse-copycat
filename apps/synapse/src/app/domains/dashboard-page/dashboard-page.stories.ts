import { Component, inject, signal } from '@angular/core';
import {
	type Mock,
	mockGroups,
	provideBackendApi,
	unusedCommands,
	withMock,
} from '@synapse-copycat/backend-api';
import {
	applicationConfig,
	componentWrapperDecorator,
	moduleMetadata,
	type Meta,
	type StoryObj,
} from '@storybook/angular';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { ApplicationStore } from '../../core/stores/application-store';
import { DashboardPage } from './dashboard-page';

/**
 * Driven by the real store over the stateful mock, not by a store of frozen
 * state.
 *
 * The page's whole job is now a set of commands — create, move, release,
 * rename — and a fixture that only holds values cannot tell whether any of
 * them work. `mockGroups` keeps the one rule that matters, so a story here
 * fails for the same reason the application would.
 */
const backend = (participants: string[]): Mock => ({
	...unusedCommands(),
	devices: [
		{
			kind: 'mouse',
			name: 'Basilisk Ultimate',
			vendor_id: 5426,
			product_id: 136,
		},
		{
			kind: 'keyboard',
			name: 'Huntsman Elite',
			vendor_id: 5426,
			product_id: 550,
		},
		{ kind: 'mousemat', name: 'Goliathus', vendor_id: 5426, product_id: 3074 },
		{ kind: 'streaming', name: 'Kiyo', vendor_id: 5426, product_id: 3587 },
	],
	modules: [{ kind: 'twinkly', name: 'Twinkly' }],
	...mockGroups(participants),
});

/**
 * The resolvers fill the store in the application; a story has to do it here.
 * Rendered only once both answers are in, so nothing asserts against a page
 * that has not been given its data yet.
 */
@Component({
	selector: 'dashboard-page-story-host',
	imports: [DashboardPage],
	template: '@if (ready()) { <dashboard-page /> }',
})
export class DashboardPageStoryHost {
	readonly #store = inject(ApplicationStore);
	protected readonly ready = signal(false);

	constructor() {
		void Promise.all([this.#store.getDevices(), this.#store.getGroups()]).then(
			() => this.ready.set(true),
		);
	}
}

/**
 * A real drag, driven end to end.
 *
 * Worth the trouble: this is the gesture the page is built around, and the
 * previous hand-rolled implementation could not be tested at all — the HTML5
 * drag API is not reachable from script. The CDK's is built on pointer events,
 * so it is.
 *
 * The moves are stepped rather than jumped: `DragRef` only starts dragging once
 * the pointer has travelled past its threshold, and the drop lists work out
 * what is under the pointer as it goes.
 */
const dragOnto = async (handle: Element, target: Element) => {
	const from = handle.getBoundingClientRect();
	const to = target.getBoundingClientRect();
	// ⚠️ `buttons` and `detail` are not decoration. The CDK drops a mousedown
	// with neither, reading it as `isFakeMousedownFromScreenReader` — which is
	// exactly what a default-constructed `MouseEvent` looks like, so the drag
	// silently never started.
	const at = (x: number, y: number) =>
		({
			bubbles: true,
			cancelable: true,
			clientX: x,
			clientY: y,
			button: 0,
			buttons: 1,
			detail: 1,
		}) as const;

	const startX = from.left + from.width / 2;
	const startY = from.top + from.height / 2;
	const endX = to.left + to.width / 2;
	const endY = to.top + to.height / 2;

	handle.dispatchEvent(new MouseEvent('mousedown', at(startX, startY)));
	await new Promise((resolve) => requestAnimationFrame(resolve));

	for (let step = 1; step <= 8; step++) {
		document.dispatchEvent(
			new MouseEvent(
				'mousemove',
				at(
					startX + ((endX - startX) * step) / 8,
					startY + ((endY - startY) * step) / 8,
				),
			),
		);
		await new Promise((resolve) => requestAnimationFrame(resolve));
	}

	// Checked before letting go, so a future breakage says "the drag never
	// started" instead of failing later on a count that never changed.
	if (!document.querySelector('.cdk-drag-preview')) {
		throw new Error(
			`no drag started: from ${JSON.stringify(from)} to ${JSON.stringify(to)}`,
		);
	}
	document.dispatchEvent(new MouseEvent('mouseup', at(endX, endY)));
	await new Promise((resolve) => requestAnimationFrame(resolve));
};

const meta: Meta<DashboardPage> = {
	// No .mdx beside this one, so Storybook generates the docs page.
	tags: ['autodocs'],
	component: DashboardPage,
	title: 'Synapse Application / Pages / Dashboard',
	decorators: [moduleMetadata({ imports: [DashboardPageStoryHost] })],
	render: () => ({ template: '<dashboard-page-story-host />' }),
};
export default meta;

type Story = StoryObj<DashboardPage>;

/** Everything in the group the backend makes on a first run. */
export const Default: Story = {
	decorators: [
		applicationConfig({
			providers: [
				provideBackendApi(
					withMock(backend(['5426-0136', '5426-0550', '5426-3074'])),
				),
			],
		}),
	],
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(await canvas.findByText('All devices')).toBeVisible();
		await expect(canvas.getByText('3 participants')).toBeVisible();
		// Named tiles, inside the group driving them.
		await expect(canvas.getByText('Huntsman Elite')).toBeVisible();
		// And the tray is empty, because nothing is waiting.
		await expect(canvas.getByText(/Everything is in a group/)).toBeVisible();
	},
};

/**
 * Two groups side by side, with different amounts to say.
 *
 * ⚠️ Their heights are the point, and only a real browser can tell: jsdom
 * reports 0 for every measurement.
 */
export const LevelCards: Story = {
	name: 'Cards level across a row',
	decorators: [
		applicationConfig({
			providers: [
				provideBackendApi(
					withMock(backend(['5426-0136', '5426-0550', '5426-3074'])),
				),
			],
		}),
	],
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await canvas.findByText('All devices');

		// Empty the first group of most of its members so the two differ in
		// content, then make a second one.
		await userEvent.click(canvas.getByRole('button', { name: /New group/ }));
		const dialog = await within(document.body).findByRole('dialog', {
			name: 'New group',
		});
		await userEvent.type(
			within(dialog).getByRole('textbox', { name: 'Group name' }),
			'Desk',
		);
		await userEvent.click(
			within(dialog).getByRole('button', { name: 'Create' }),
		);

		await waitFor(async () => {
			await expect(canvas.getByRole('heading', { name: 'Desk' })).toBeVisible();
		});

		// ⚠️ Measured on the panel, not on `group-card`. The host is the grid
		// item and the grid stretches it whatever happens inside, so measuring
		// the host asserts nothing at all — the painted box is the panel.
		//
		// One group holds three tiles, the other none, and they still end level.
		// The direct child only: the ambience panel inside the disclosure is a
		// `syn-panel` too.
		const heights = [
			...canvasElement.querySelectorAll('group-card > syn-panel'),
		].map((panel) => (panel as HTMLElement).offsetHeight);
		await expect(heights).toHaveLength(2);
		await expect(new Set(heights).size).toBe(1);
	},
};

/**
 * Three groups in a window two cards wide.
 *
 * ⚠️ The wrapping is the assertion, and only a real browser can make it: jsdom
 * has no layout, so every `offsetTop` there is 0 and the same test would pass
 * against a single unbroken row.
 */
export const Wrapping: Story = {
	name: 'Wrapping onto a second row',
	decorators: [
		componentWrapperDecorator(
			(story) => `<div style="width: 46rem">${story}</div>`,
		),
		applicationConfig({
			providers: [
				provideBackendApi(withMock(backend(['5426-0136', '5426-0550']))),
			],
		}),
	],
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await canvas.findByText('All devices');

		// A group on its own takes the row rather than sitting in a third of it
		// with two empty tracks beside it.
		const lone = canvasElement.querySelector('group-card') as HTMLElement;
		const row = lone.parentElement as HTMLElement;
		await expect(lone.offsetWidth).toBe(row.offsetWidth);

		for (const name of ['Desk', 'Shelf']) {
			await userEvent.click(canvas.getByRole('button', { name: /New group/ }));
			const dialog = await within(document.body).findByRole('dialog', {
				name: 'New group',
			});
			await userEvent.type(
				within(dialog).getByRole('textbox', { name: 'Group name' }),
				name,
			);
			await userEvent.click(
				within(dialog).getByRole('button', { name: 'Create' }),
			);
			await waitFor(async () => {
				await expect(canvas.getByRole('heading', { name })).toBeVisible();
			});
		}

		const cards = [...canvasElement.querySelectorAll('group-card')];
		await expect(cards).toHaveLength(3);

		// 46rem holds two cards at the 20rem floor and no more, so the third
		// starts a second row. The count follows the window, and the cap only
		// bites on screens wide enough to want more than it allows.
		const tops = cards.map((card) => (card as HTMLElement).offsetTop);
		await expect(new Set(tops).size).toBe(2);
		await expect(tops[0]).toBe(tops[1]);
		await expect(tops[2]).toBeGreaterThan(tops[0]);
	},
};

/**
 * Four groups in a window wide enough for five.
 *
 * ⚠️ The cap is the assertion. Without it the row keeps taking columns until
 * the cards are 20rem postage stamps, which is the point where "how many fit"
 * stops meaning "how many are worth reading".
 */
export const Capped: Story = {
	name: 'Capped at three columns',
	decorators: [
		componentWrapperDecorator(
			(story) => `<div style="width: 90rem">${story}</div>`,
		),
		applicationConfig({
			providers: [
				provideBackendApi(withMock(backend(['5426-0136', '5426-0550']))),
			],
		}),
	],
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await canvas.findByText('All devices');

		for (const name of ['Desk', 'Shelf', 'Rack']) {
			await userEvent.click(canvas.getByRole('button', { name: /New group/ }));
			const dialog = await within(document.body).findByRole('dialog', {
				name: 'New group',
			});
			await userEvent.type(
				within(dialog).getByRole('textbox', { name: 'Group name' }),
				name,
			);
			await userEvent.click(
				within(dialog).getByRole('button', { name: 'Create' }),
			);
			await waitFor(async () => {
				await expect(canvas.getByRole('heading', { name })).toBeVisible();
			});
		}

		const cards = [...canvasElement.querySelectorAll('group-card')];
		await expect(cards).toHaveLength(4);

		// 90rem would hold four cards at the 20rem floor, so the fourth is on a
		// second row because of the cap and not because it did not fit.
		const tops = cards.map((card) => (card as HTMLElement).offsetTop);
		await expect(new Set(tops).size).toBe(2);
		await expect(tops[2]).toBe(tops[0]);
		await expect(tops[3]).toBeGreaterThan(tops[0]);
	},
};

/** Nothing saved and nothing plugged in: the emptiest the page ever is. */
export const NoGroups: Story = {
	decorators: [
		applicationConfig({
			providers: [provideBackendApi(withMock(backend([])))],
		}),
	],
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(await canvas.findByText(/No group yet/)).toBeVisible();
		await expect(
			canvas.getByRole('button', { name: /New group/ }),
		).toBeVisible();
	},
};

/**
 * The whole first-run path, in one go: make a group, then put something in it.
 *
 * This is the story that would have caught a `create_group` wired to nothing —
 * it goes through the store, the mock conductor and back out to the rendered
 * page rather than asserting that a handler was called.
 */
export const CreatingAGroup: Story = {
	name: 'Creating a group and filling it',
	decorators: [
		applicationConfig({
			providers: [
				provideBackendApi(withMock(backend(['5426-0136', '5426-0550']))),
			],
		}),
	],
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const body = within(document.body);

		await canvas.findByText('All devices');

		await userEvent.click(canvas.getByRole('button', { name: /New group/ }));

		// Rendered into the CDK's overlay container, which hangs off the body
		// rather than off the story's canvas.
		const dialog = await body.findByRole('dialog', { name: 'New group' });
		await userEvent.type(
			within(dialog).getByRole('textbox', { name: 'Group name' }),
			'Desk',
		);
		await userEvent.click(
			within(dialog).getByRole('button', { name: 'Create' }),
		);

		// It arrives empty and stopped: a group is a container first.
		await waitFor(async () => {
			await expect(canvas.getByRole('heading', { name: 'Desk' })).toBeVisible();
		});
		await expect(
			canvas.getByRole('switch', { name: 'Run Desk' }),
		).not.toBeChecked();

		// Now move a participant into it without dragging — the keyboard path,
		// and the only one a test can drive.
		await userEvent.click(
			canvas.getByRole('button', { name: 'Move Basilisk Ultimate' }),
		);
		await userEvent.click(canvas.getByRole('button', { name: 'Place here' }));

		await waitFor(async () => {
			// One left where it was, one moved: two groups of one. The backend
			// released it from the first on the way, which is the rule doing its
			// job rather than being worked around.
			await expect(canvas.getAllByText('1 participant')).toHaveLength(2);
		});
	},
};

/**
 * Taking a device back out. Not an error and not a deletion — an unlit
 * keyboard while the rest of the desk breathes is a legitimate arrangement.
 */
export const Releasing: Story = {
	name: 'Taking a device out of its group',
	decorators: [
		applicationConfig({
			providers: [
				provideBackendApi(withMock(backend(['5426-0136', '5426-0550']))),
			],
		}),
	],
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await canvas.findByText('All devices');
		await expect(canvas.getByText(/Everything is in a group/)).toBeVisible();

		await userEvent.click(
			canvas.getByRole('button', { name: 'Move Huntsman Elite' }),
		);
		await userEvent.click(
			canvas.getByRole('button', { name: /Take Huntsman Elite out/ }),
		);

		await waitFor(async () => {
			await expect(canvas.getByText('1 participant')).toBeVisible();
		});
		// And it is in the tray, where the page says nothing is driving it.
		await expect(
			canvas.queryByText(/Everything is in a group/),
		).not.toBeInTheDocument();
	},
};

/** Renaming and pacing, both behind the group's own disclosure. */
export const Tuning: Story = {
	name: 'Renaming and pacing a group',
	decorators: [
		applicationConfig({
			providers: [provideBackendApi(withMock(backend(['5426-0136'])))],
		}),
	],
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await canvas.findByText('All devices');

		// The name is the title, not a field in the disclosure.
		await userEvent.click(canvas.getByRole('button', { name: 'All devices' }));
		const name = canvas.getByRole('textbox', { name: 'Rename All devices' });
		await userEvent.clear(name);
		await userEvent.type(name, 'Desk{Enter}');

		await waitFor(async () => {
			await expect(canvas.getByRole('heading', { name: 'Desk' })).toBeVisible();
		});

		// The cadence does live in the disclosure.
		await userEvent.click(
			canvasElement.querySelector('summary') as HTMLElement,
		);
		const cadence = canvas.getByRole('combobox', { name: 'Cadence for Desk' });
		await userEvent.selectOptions(cadence, 'slow');

		await waitFor(async () => {
			await expect(cadence).toHaveValue('slow');
		});
	},
};

/**
 * The gesture the page is built around: a device dragged out of its group into
 * the tray, and back into the group again.
 */
export const Dragging: Story = {
	name: 'Dragging a device between a group and the tray',
	decorators: [
		applicationConfig({
			providers: [
				provideBackendApi(withMock(backend(['5426-0136', '5426-0550']))),
			],
		}),
	],
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await canvas.findByText('All devices');

		const tileFor = (name: string) =>
			canvas.getByText(name).closest('participant-card') as HTMLElement;
		const tray = canvasElement.querySelector(
			'.dashboard-page__tray',
		) as HTMLElement;
		const tiles = canvasElement.querySelector(
			'.group-card__tiles',
		) as HTMLElement;

		await dragOnto(tileFor('Huntsman Elite'), tray);

		await waitFor(async () => {
			await expect(canvas.getByText('1 participant')).toBeVisible();
		});
		await expect(within(tray).getByText('Huntsman Elite')).toBeInTheDocument();

		// And back, which is the other half of what the tray is for.
		await dragOnto(tileFor('Huntsman Elite'), tiles);

		await waitFor(async () => {
			await expect(canvas.getByText('2 participants')).toBeVisible();
		});
	},
};
