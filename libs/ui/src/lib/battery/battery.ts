import {
	booleanAttribute,
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	numberAttribute,
} from '@angular/core';

/** Below this, and not charging, the gauge turns to the error colour. */
export const BATTERY_LOW = 20;

/**
 * A battery gauge, drawn like Android's: a rounded cell that fills from the
 * left, a bolt while charging, and the figure beside it.
 *
 * The drawing is inline SVG rather than an asset, for the same reason the
 * Razer mark is: an `<img>` is an isolated document and could not take the
 * theme colour.
 */
@Component({
	selector: 'syn-battery',
	templateUrl: './battery.html',
	styleUrl: './battery.scss',
	host: {
		role: 'img',
		'[attr.aria-label]': 'label()',
		'[class.syn-battery--charging]': 'charging()',
		'[class.syn-battery--low]': 'low()',
	},
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Battery {
	/** Percentage. Anything outside 0–100 is brought back into it. */
	readonly level = input.required({ transform: numberAttribute });

	readonly charging = input(false, { transform: booleanAttribute });

	/** Overrides the sentence built from the level and the charging state. */
	readonly ariaLabel = input<string | undefined>(undefined);

	protected readonly percent = computed(() =>
		Math.min(100, Math.max(0, Math.round(this.level()))),
	);

	/** Charging is never "low": it is already being dealt with. */
	protected readonly low = computed(
		() => !this.charging() && this.percent() <= BATTERY_LOW,
	);

	/**
	 * The cell is 18 units of drawable width. The fill keeps a sliver at 0 so
	 * an empty battery still reads as a battery rather than an empty outline.
	 */
	protected readonly fillWidth = computed(() =>
		Math.max(1, (18 * this.percent()) / 100),
	);

	protected readonly label = computed(
		() =>
			this.ariaLabel() ??
			`Battery ${this.percent()}%, ${this.charging() ? 'charging' : 'discharging'}`,
	);
}
