import type { Locator, Page } from '@playwright/test';

/**
 * Page object for `/studio` — the ambience-panel bench with no group and no
 * device behind it (see `studio-page.ts`'s own doc comment: "colour only,"
 * "a bench, not the studio"). Useful here precisely because it lets the three
 * ambience channels be exercised without creating a group first — which is
 * exactly what `po`'s journeys.md §4 asks to be verified independently of
 * one.
 */
export class StudioPage {
	constructor(private readonly page: Page) {}

	async goto(): Promise<void> {
		await this.page.goto('/studio');
	}

	get panel(): Locator {
		return this.page.locator('ambience-panel');
	}

	get preview(): Locator {
		return this.page.getByRole('img', { name: 'The ambience being built' });
	}

	private firstCell(): Locator {
		return this.preview.locator('.ambience-preview__cell').first();
	}

	/**
	 * The rendered colour of the first cell, as the browser normalises it
	 * (`rgb(r, g, b)`) — read from the live style rather than parsed out of an
	 * attribute, so it reflects whatever Angular actually painted.
	 */
	previewColour(): Promise<string> {
		return this.firstCell().evaluate(
			(el) => getComputedStyle(el).backgroundColor,
		);
	}

	colourSourceSelect(): Locator {
		return this.panel.getByLabel('Colour source');
	}

	motionSourceSelect(): Locator {
		return this.panel.getByLabel('Motion source');
	}

	brightnessSourceSelect(): Locator {
		return this.panel.getByLabel('Brightness source');
	}

	async setFixedColour(hex: string): Promise<void> {
		await this.panel.getByLabel('Chosen colour').fill(hex);
	}

	async setBrightnessLevel(percent: number): Promise<void> {
		await this.panel.getByLabel('Brightness level').fill(String(percent));
	}

	async setWaveSpeed(percent: number): Promise<void> {
		await this.panel.getByLabel('Wave speed').fill(String(percent));
	}

	waveSpeed(): Promise<string> {
		return this.panel.getByLabel('Wave speed').inputValue();
	}
}
