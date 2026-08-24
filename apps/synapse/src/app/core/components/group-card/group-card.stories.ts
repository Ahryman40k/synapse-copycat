import type {
	Achieved,
	Device,
	GroupStatus,
} from '@synapse-copycat/backend-api';
import { still } from '@synapse-copycat/backend-api';
import { componentWrapperDecorator } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import { Component, signal } from '@angular/core';
import { moduleMetadata } from '@storybook/angular';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { GroupCard } from './group-card';

const meta: Meta<GroupCard> = {
	// No .mdx beside this one, so Storybook generates the docs page.
	tags: ['autodocs'],
	component: GroupCard,
	title: 'Synapse application / Components / group card',
	decorators: [
		componentWrapperDecorator(
			(story) => `<div style="padding:1rem; max-width:34rem">${story}</div>`,
		),
	],
};

export default meta;
type Story = StoryObj<GroupCard>;

const CATALOGUE: Device[] = [
	{
		__type: 'device',
		kind: 'keyboard',
		id: '5426-0550',
		name: 'Huntsman Elite',
		visual: 'assets/devices/5426-0550.png',
	},
	{
		__type: 'device',
		kind: 'mousemat',
		id: '5426-3074',
		name: 'Goliathus',
		visual: 'assets/devices/5426-3074.png',
	},
	{
		__type: 'device',
		kind: 'mouse',
		id: '5426-0136',
		name: 'Basilisk Ultimate',
		visual: 'assets/devices/5426-0136.png',
	},
];

const measured = (every: number, perFrameMs: number): Achieved => ({
	requested: 'normal',
	perFrameMs,
	frames: 30,
	every,
});

const desk: GroupStatus = {
	group: {
		id: 0,
		name: 'Desk',
		members: ['5426-0550', '5426-3074', '5426-0136'],
		ambience: {
			colour: { type: 'rainbow', turnsPerSecond: 0.2, spread: 1 },
			motion: { type: 'wave', lapsPerSecond: 0.5, width: 0.2 },
			brightness: { type: 'circadian', day: 1, night: 0.2 },
		},
		cadence: 'normal',
		started: true,
	},
	devices: [
		{ serial: '5426-0550', painted: true, achieved: measured(1, 7.8) },
		// One LED: nothing to draw a picture on, so the ambience is averaged.
		{ serial: '5426-3074', painted: false, achieved: measured(1, 1.2) },
		// Cannot afford every tick, so it takes every fourth and runs at 7.5Hz
		// while the keyboard beside it keeps 30. That is the whole point of
		// showing the achieved rate rather than the requested one.
		{ serial: '5426-0136', painted: true, achieved: measured(4, 24.6) },
	],
	skipped: [],
};

/**
 * A host, because an output is what is being asserted and Storybook's own arg
 * spies do not stand in for one here — the same shape the ambience panel's
 * binding story uses.
 */
@Component({
	selector: 'group-card-story-host',
	imports: [GroupCard],
	template: `
		<group-card
			[status]="status"
			[catalogue]="catalogue"
			carrying="5426-3587"
			(participantDropped)="taken.set($event)"
		></group-card>
		<pre data-testid="taken">{{ taken() }}</pre>
	`,
})
export class GroupCardStoryHost {
	readonly status = desk;
	readonly catalogue = CATALOGUE;
	readonly taken = signal('');
}

export const Running: Story = {
	name: 'Drawing',
	args: { status: desk, catalogue: CATALOGUE },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByText('3 participants')).toBeVisible();
		// Named, not serialised: nobody recognises their desk in a list of
		// product ids.
		await expect(canvas.getByText('Huntsman Elite')).toBeVisible();

		// The rate each device actually reached, not the one asked for.
		await expect(
			canvas.getByText('full picture · 30 Hz · 7.8 ms'),
		).toBeVisible();
		await expect(
			canvas.getByText('full picture · 8 Hz · 24.6 ms'),
		).toBeVisible();
		// "one colour" is not a failure — a Goliathus has a single LED.
		await expect(canvas.getByText('one colour · 30 Hz · 1.2 ms')).toBeVisible();

		await expect(
			canvas.getByRole('switch', { name: 'Run Desk' }),
		).toBeChecked();
	},
};

/**
 * Nothing is measuring, and that is not the same as nothing answering.
 *
 * A stopped group has no engine — and neither does the browser mock, which
 * invents no measurements on purpose. Both must read as "here is who is in it",
 * not as a list of devices that failed.
 */
export const Stopped: Story = {
	name: 'At rest',
	args: {
		status: {
			group: { ...desk.group, started: false },
			devices: [],
			skipped: [],
		},
		catalogue: CATALOGUE,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByText('Huntsman Elite')).toBeVisible();
		await expect(canvas.getByText('3 participants')).toBeVisible();
		// No tile says what it is achieving, because nothing is measuring.
		// Matched on the tiles rather than on "Hz", which the cadence options
		// in the disclosure also contain.
		await expect(
			canvasElement.querySelectorAll('.participant-card__doing'),
		).toHaveLength(0);
		await expect(
			canvas.getByRole('switch', { name: 'Run Desk' }),
		).not.toBeChecked();

		// Still level, with nothing to report on any of them.
		const heights = [...canvasElement.querySelectorAll('participant-card')].map(
			(tile) => (tile as HTMLElement).offsetHeight,
		);
		await expect(new Set(heights).size).toBe(1);
	},
};

export const NotYetMeasured: Story = {
	name: 'Just started',
	args: {
		status: {
			...desk,
			devices: [
				{
					serial: '5426-0550',
					painted: true,
					// `frames: 0` is how "no second has passed yet" reads.
					achieved: { requested: 'normal', perFrameMs: 0, frames: 0, every: 1 },
				},
			],
		},
		catalogue: CATALOGUE,
	},
	play: async ({ canvasElement }) => {
		await expect(
			within(canvasElement).getByText('full picture · measuring…'),
		).toBeVisible();
	},
};

/**
 * A member the engine could not take on.
 *
 * On its own tile rather than in a section of its own: the question a reader
 * has is "what is each of my devices doing", and an answer filed somewhere else
 * makes them match two lists by serial number.
 */
export const Skipped: Story = {
	name: 'One could not be driven',
	args: {
		status: {
			group: { ...desk.group, members: [...desk.group.members, '5426-3587'] },
			devices: desk.devices,
			skipped: [{ serial: '5426-3587', because: 'no lighting interface' }],
		},
		catalogue: CATALOGUE,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByText('no lighting interface')).toBeVisible();
		// Counted like the others: it is in the group, it is just not drawing.
		await expect(canvas.getByText('4 participants')).toBeVisible();

		// The reason is longer than a rate, and the tile carrying it must not
		// make the shelf ragged — an uneven row reads as a fault in the short
		// ones rather than as extra words in the tall one.
		const heights = [...canvasElement.querySelectorAll('participant-card')].map(
			(tile) => (tile as HTMLElement).offsetHeight,
		);
		await expect(heights).toHaveLength(4);
		await expect(new Set(heights).size).toBe(1);
		// Unknown to the catalogue, so its identifier stands in for a name
		// rather than the tile coming up blank.
		await expect(canvas.getByText('5426-3587')).toBeVisible();
	},
};

export const Empty: Story = {
	name: 'Nobody in it',
	args: {
		status: {
			group: { ...desk.group, members: [], started: false },
			devices: [],
			skipped: [],
		},
		catalogue: CATALOGUE,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText('0 participants')).toBeVisible();
		await expect(canvas.getByText(/Nothing in this group yet/)).toBeVisible();
	},
};

/**
 * The settings are a native disclosure, closed until asked.
 *
 * Sliders in every card would make the dashboard a wall of controls and bury
 * the one thing it is for.
 */
export const Settings: Story = {
	name: 'Opening the settings',
	args: {
		status: { ...desk, group: { ...desk.group, ambience: still('#00ff00') } },
		catalogue: CATALOGUE,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		const settings = canvasElement.querySelector('details');
		await expect(canvas.getByText('#00ff00 · Still · 100%')).toBeVisible();
		// Closed. Asserted on the element and not by querying for the controls:
		// a closed `<details>` hides its content with `content-visibility`,
		// which testing-library's visibility check cannot see.
		await expect(settings).not.toHaveAttribute('open');

		await userEvent.click(canvas.getByText('#00ff00 · Still · 100%'));

		await expect(settings).toHaveAttribute('open');

		// Cadence and the three channels, behind the one disclosure. The name is
		// not here — it is the title.
		await expect(
			canvas.queryByRole('textbox', { name: 'Rename Desk' }),
		).not.toBeInTheDocument();
		await expect(
			canvas.getByRole('combobox', { name: 'Cadence for Desk' }),
		).toHaveValue('normal');
		await expect(
			canvas.getByRole('combobox', { name: 'Colour source' }),
		).toBeVisible();
	},
};

/**
 * ⚠️ The platform has no keyboard equivalent for dragging, so the card has to
 * offer the same move without one: pick a participant up by its handle, and
 * put it down here. This story is the only automated cover for that path —
 * a real drag cannot be driven from a test.
 */
export const Receiving: Story = {
	name: 'Taking a participant without dragging',
	decorators: [moduleMetadata({ imports: [GroupCardStoryHost] })],
	render: () => ({ template: '<group-card-story-host />' }),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await userEvent.click(canvas.getByRole('button', { name: 'Place here' }));

		await expect(canvas.getByTestId('taken')).toHaveTextContent('5426-3587');
	},
};

/**
 * Renaming in place.
 *
 * A field open in every card was too much furniture for something done once, so
 * the title is a button until it is pressed. That it takes focus as it appears
 * is the part worth a story: a field that opens and waits to be clicked is
 * worse than the button it replaced, and jsdom cannot tell you where focus is
 * in a way that means anything.
 */
export const Renaming: Story = {
	name: 'Renaming from the title',
	args: { status: desk, catalogue: CATALOGUE },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		// A heading at rest, which is what lets a reader move between cards.
		await expect(canvas.getByRole('heading', { name: 'Desk' })).toBeVisible();

		await userEvent.click(canvas.getByRole('button', { name: 'Desk' }));

		const field = canvas.getByRole('textbox', { name: 'Rename Desk' });
		await expect(field).toHaveValue('Desk');
		// Focus arrives in the after-render phase, which is a frame later than
		// the click that caused it.
		await waitFor(async () => {
			await expect(field).toHaveFocus();
		});

		// And leaving puts the heading back, changed or not.
		await userEvent.keyboard('{Escape}');
		await expect(canvas.getByRole('heading', { name: 'Desk' })).toBeVisible();
	},
};

export const AlreadyHere: Story = {
	name: 'Nothing to take',
	args: { status: desk, catalogue: CATALOGUE, carrying: '5426-0550' },
	play: async ({ canvasElement }) => {
		// It is already a member, so this card offers nothing — and refuses the
		// drop too, rather than sending a move that changes nothing.
		await expect(
			within(canvasElement).queryByRole('button', { name: 'Place here' }),
		).not.toBeInTheDocument();
	},
};

/**
 * Removing a group.
 *
 * ⚠️ It used to sit at the bottom of the closed disclosure, under the whole
 * ambience panel — "quiet until reached for", which in practice meant nobody
 * found it. It is in the header now, and what stops a mis-click is the second
 * press rather than the button being hard to see.
 */
export const Removing: Story = {
	name: 'Removing a group',
	decorators: [moduleMetadata({ imports: [GroupCardStoryHost] })],
	args: { status: desk, catalogue: CATALOGUE },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		// Findable without opening anything.
		await userEvent.click(canvas.getByRole('button', { name: 'Remove Desk' }));

		// And the second press says what it costs: the participants are not
		// deleted, they go back to waiting.
		await expect(
			canvas.getByText(/Its 3 participants go back to waiting/),
		).toBeVisible();

		// Backing out leaves everything alone.
		await userEvent.click(canvas.getByRole('button', { name: 'Keep it' }));
		await expect(
			canvas.queryByRole('button', { name: 'Remove' }),
		).not.toBeInTheDocument();
	},
};
