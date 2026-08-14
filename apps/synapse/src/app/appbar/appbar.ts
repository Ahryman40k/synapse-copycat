import {
	ChangeDetectionStrategy,
	Component,
	computed,
	type ElementRef,
	effect,
	input,
	output,
	signal,
	viewChild,
	viewChildren,
} from '@angular/core';
import type { Device, Module } from '@synapse-copycat/backend-api';

/** What a button shows, and the entry it stands for. */
type Entry<T> = { item: T; label: string };

/** Devices are keyed by id, modules by kind — see `activeId`. */
function entryId(item: Device | Module): string {
	return item.__type === 'device' ? item.id : item.kind;
}

/**
 * Label by kind — `mouse`, `mousemat` — and number them only when there is more
 * than one of that kind: `mouse (1)`, `mouse (2)`.
 *
 * Kinds are short and stable, which matters in a bar that has to fit a window
 * the user can make narrow. Device names are long and inconsistent, so they
 * would push the bar into scrolling almost immediately.
 */
function labelByKind<T extends { kind: string }>(
	items: readonly T[],
): Entry<T>[] {
	const totals = new Map<string, number>();
	for (const item of items) {
		totals.set(item.kind, (totals.get(item.kind) ?? 0) + 1);
	}

	const seen = new Map<string, number>();
	return items.map((item) => {
		if ((totals.get(item.kind) ?? 0) < 2) return { item, label: item.kind };

		const position = (seen.get(item.kind) ?? 0) + 1;
		seen.set(item.kind, position);
		return { item, label: `${item.kind} (${position})` };
	});
}

/**
 * The application-level navigation bar.
 *
 * It stays dumb: it emits what was activated and the layout, which already owns
 * the Router, does the navigating. `activeId` comes back the same way, so the
 * bar can mark the current entry without ever importing the router — the same
 * separation the component already had, extended to the state it was missing.
 */
@Component({
	selector: 'syn-bar, nav[synapse-bar]',
	templateUrl: './appbar.html',
	styleUrl: './appbar.scss',
	host: {
		role: 'navigation',
		'[attr.aria-label]': 'ariaLabel()',
		'(keydown.escape)': 'closeOverflow()',
	},
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppBar {
	readonly devices = input.required<Device[]>();
	readonly modules = input.required<Module[]>();

	/**
	 * Key of the entry currently shown. Devices are keyed by `id` — the
	 * zero-padded `vendor_id-product_id` pair, which tells two different models
	 * apart — and modules by `kind`, until they gain an id of their own.
	 *
	 * Undefined on the dashboard, which is when Home is the current entry.
	 *
	 * ⚠️ Two units of the *same* model share a `vendor_id-product_id` and would
	 * both be marked. Telling those apart needs the device serial, which the
	 * Rust backend has but the wire shape drops — see libs/backend-api/AGENTS.md.
	 */
	readonly activeId = input<string | undefined>(undefined);

	readonly ariaLabel = input('Devices and modules');

	/** Numbered only where a kind repeats — see `labelByKind`. */
	protected readonly deviceEntries = computed(() =>
		labelByKind(this.devices()),
	);
	protected readonly moduleEntries = computed(() =>
		labelByKind(this.modules()),
	);

	readonly deviceActivated = output<Device>();
	readonly moduleActivated = output<Module>();
	readonly homeRequested = output<void>();

	// ── overflow ──────────────────────────────────────────────────────────────
	// Entries that do not fit move into a `⋯` menu instead of scrolling out of
	// sight. Scrolling was the wrong answer here: with the scrollbar hidden it
	// was invisible, and with it shown it would eat a third of a 2.5em bar.
	// A menu is reachable with the mouse, which scrolling a hidden overflow is
	// not.
	//
	// Which entries fit is decided by an IntersectionObserver rather than by
	// width arithmetic. Clipped buttons keep `visibility: hidden`, so they stay
	// in the layout — that is what stops the classic oscillation where hiding an
	// item frees room, which makes it fit again. The trigger keeps its slot for
	// the same reason, even when it has nothing to show.
	//
	// Only the entries region is clipped, never the host: an `overflow: hidden`
	// ancestor clips absolutely positioned descendants too, which is what kept
	// the menu invisible when the host did the clipping.

	private readonly entriesRegion =
		viewChild.required<ElementRef<HTMLElement>>('entries');
	private readonly buttons =
		viewChildren<ElementRef<HTMLButtonElement>>('entryButton');

	/**
	 * Ids clipped out of the bar. Written by the observer — and public so specs
	 * can drive it, since jsdom has no IntersectionObserver and therefore no
	 * layout to observe.
	 */
	readonly overflowing = signal<ReadonlySet<string>>(new Set());

	protected readonly overflowOpen = signal(false);

	protected readonly hiddenEntries = computed(() => {
		const clipped = this.overflowing();
		return [...this.deviceEntries(), ...this.moduleEntries()].filter((entry) =>
			clipped.has(entryId(entry.item)),
		);
	});

	protected readonly hasOverflow = computed(
		() => this.hiddenEntries().length > 0,
	);

	constructor() {
		// jsdom has none; the bar simply shows everything there.
		if (typeof IntersectionObserver === 'undefined') return;

		// `viewChildren` is a signal, so this re-observes whenever a device comes
		// or goes. The observer is rebuilt with it, which keeps its lifetime tied
		// to the effect's cleanup and needs no nullable field.
		effect((onCleanup) => {
			const observer = new IntersectionObserver(
				(records) => {
					const clipped = new Set(this.overflowing());
					for (const record of records) {
						const id = (record.target as HTMLElement).dataset['entryId'];
						if (!id) continue;
						if (record.isIntersecting) clipped.delete(id);
						else clipped.add(id);
					}
					this.overflowing.set(clipped);
				},
				{
					// The entries region, not the host: it is the box that clips, and
					// the trigger sits beside it rather than over it.
					root: this.entriesRegion().nativeElement,
					threshold: 1,
				},
			);

			for (const button of this.buttons()) {
				observer.observe(button.nativeElement);
			}

			onCleanup(() => observer.disconnect());
		});
	}

	protected entryId = entryId;

	protected toggleOverflow(): void {
		this.overflowOpen.update((open) => !open);
	}

	protected closeOverflow(): void {
		this.overflowOpen.set(false);
	}

	/** Picking from the menu closes it, like any menu. */
	protected activateFromMenu(item: Device | Module): void {
		this.closeOverflow();
		if (item.__type === 'device') this.activateDevice(item);
		else this.activateModule(item);
	}

	protected goHome(): void {
		this.homeRequested.emit();
	}

	protected activateDevice(device: Device): void {
		this.deviceActivated.emit(device);
	}

	protected activateModule(module: Module): void {
		this.moduleActivated.emit(module);
	}
}
