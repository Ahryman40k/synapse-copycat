import { Component } from '@angular/core';
import { type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';
// `storybook/test` re-exports @testing-library/dom, but *instrumented*: each
// query and event shows up as a replayable step in the Interactions panel.
// Importing @testing-library/angular directly here loses that, which is what
// the storybook/use-storybook-testing-library rule protects.
import { expect, fireEvent, fn, waitFor, within } from 'storybook/test';
import { PageBarComponent, type PageBarDescriptor } from './page-bar';

@Component({
	selector: 'customize-panel',
	template: '<p>Customize panel</p>',
})
export class CustomizePanelStub {}

@Component({
	selector: 'lighting-panel',
	template: '<p>Lighting panel</p>',
})
export class LightingPanelStub {}

@Component({
	selector: 'power-panel',
	template: '<p>Power panel</p>',
})
export class PowerPanelStub {}

const DESCRIPTOR: PageBarDescriptor = [
	{ title: 'customize', component: CustomizePanelStub },
	{ title: 'lighting', component: LightingPanelStub },
	{ title: 'power', component: PowerPanelStub },
];

const meta: Meta<PageBarComponent> = {
	component: PageBarComponent,
	title: 'Synapse Application / Components / Page Bar',
	args: {
		descriptor: DESCRIPTOR,
		ariaLabel: 'Mouse sections',
		panelChanging: fn(),
	},
	decorators: [
		moduleMetadata({
			imports: [CustomizePanelStub, LightingPanelStub, PowerPanelStub],
		}),
	],
};
/**
 * The bar moves its selection inside a view transition, which is asynchronous
 * in a browser that has one. jsdom has none, so the fallback path runs
 * synchronously there and the specs never had to wait — here they do.
 */
const untilSelected = (tab: HTMLElement) =>
	waitFor(() => {
		if (tab.getAttribute('aria-selected') !== 'true') {
			throw new Error(`not selected yet: ${tab.textContent?.trim()}`);
		}
	});

const untilPanelReads = (panel: HTMLElement, text: string) =>
	waitFor(() => {
		if (!panel.textContent?.includes(text)) {
			throw new Error(`panel still reads: ${panel.textContent?.trim()}`);
		}
	});

export default meta;

type Story = StoryObj<PageBarComponent>;

/**
 * The active section is now visible — an underline and full opacity. The bar
 * used only to emit, so nothing on screen said where you were.
 */
export const Default: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('tablist', { name: 'Mouse sections' }),
		).toBeVisible();
		await expect(canvas.getAllByRole('tab')).toHaveLength(3);
		await expect(
			canvas.getByRole('tab', { name: 'customize' }),
		).toHaveAttribute('aria-selected', 'true');
	},
};

/** A single section still renders as a tablist of one. */
export const SingleSection: Story = {
	name: 'Single section',
	args: { descriptor: [DESCRIPTOR[1]], ariaLabel: 'Mousemat sections' },
};

/** The real mouse page: five sections, which is where wrapping matters. */
export const ManySections: Story = {
	name: 'Many sections',
	args: {
		descriptor: [
			{ title: 'customize', component: CustomizePanelStub },
			{ title: 'performance', component: LightingPanelStub },
			{ title: 'lighting', component: LightingPanelStub },
			{ title: 'calibration', component: LightingPanelStub },
			{ title: 'power', component: PowerPanelStub },
		],
	},
};

/**
 * The whole bar is one tab stop; the arrows move within it and select as they
 * go. A plain row of buttons would cost one Tab press per section and tell a
 * screen-reader user nothing about how many there are.
 */
export const Keyboard: Story = {
	name: 'Keyboard navigation',
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const first = canvas.getByRole('tab', { name: 'customize' });

		// Roving tabindex.
		await expect(first).toHaveAttribute('tabindex', '0');
		await expect(canvas.getByRole('tab', { name: 'lighting' })).toHaveAttribute(
			'tabindex',
			'-1',
		);

		first.focus();
		fireEvent.keyDown(first, { key: 'ArrowRight' });

		const second = canvas.getByRole('tab', { name: 'lighting' });
		await untilSelected(second);
		await expect(second).toHaveAttribute('aria-selected', 'true');
		await expect(second).toHaveFocus();

		fireEvent.keyDown(second, { key: 'End' });
		const last = canvas.getByRole('tab', { name: 'power' });
		await untilSelected(last);
		await expect(last).toHaveAttribute('aria-selected', 'true');
	},
};

// ── the page pattern ────────────────────────────────────────────────────────

@Component({
	selector: 'page-bar-story-host',
	imports: [PageBarComponent, CustomizePanelStub],
	template: `
		<page-bar #bar [descriptor]="descriptor" ariaLabel="Mouse sections" />
		<div
			role="tabpanel"
			[id]="bar.activePanelId()"
			[attr.aria-labelledby]="bar.activeTabId()"
			style="padding:1rem; font:13px system-ui"
		>
			Showing: <strong>{{ bar.activeItem().title }}</strong>
		</div>
	`,
})
export class PageBarStoryHost {
	readonly descriptor = DESCRIPTOR;
}

/**
 * How a device page wires it. The bar owns the selection and the tab ids; the
 * page only renders the panel and labels it. Pages used to keep their own copy
 * of the selection and sync it through an output.
 */
export const WithPanel: Story = {
	name: 'With its panel',
	decorators: [moduleMetadata({ imports: [PageBarStoryHost] })],
	render: () => ({ template: '<page-bar-story-host />' }),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		const panel = canvas.getByRole('tabpanel');
		await expect(panel).toHaveTextContent('customize');

		canvas.getByRole('tab', { name: 'power' }).click();
		await untilPanelReads(panel, 'power');
		await expect(canvas.getByRole('tabpanel')).toHaveTextContent('power');

		// The panel is labelled by the selected tab, which is what makes a
		// screen reader announce the pair.
		await expect(panel).toHaveAttribute(
			'aria-labelledby',
			canvas.getByRole('tab', { name: 'power' }).id,
		);
	},
};
