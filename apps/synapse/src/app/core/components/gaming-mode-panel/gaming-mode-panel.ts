import {
	ChangeDetectionStrategy,
	Component,
	computed,
	model,
} from '@angular/core';
import { CheckboxComponent, Panel, SwitchComponent } from '@synapse-copycat/ui';

/**
 * What gaming mode suppresses while it is on.
 *
 * One object rather than six models: they are read and written together, and
 * the backend will take them as one request.
 */
export type GamingMode = {
	activated: boolean;
	/** Only suppress the keys while a game holds the foreground. */
	inGameOnly: boolean;
	disableWindowsKey: boolean;
	disableMenuKey: boolean;
	disableAltTab: boolean;
	disableAltF4: boolean;
};

export const GAMING_MODE_DEFAULT: GamingMode = {
	activated: false,
	inGameOnly: false,
	disableWindowsKey: true,
	disableMenuKey: false,
	disableAltTab: false,
	disableAltF4: false,
};

/** The four shortcuts, so the template lists them instead of repeating markup. */
type SuppressedKey = {
	key: keyof Omit<GamingMode, 'activated' | 'inGameOnly'>;
	label: string;
};

@Component({
	selector: 'gaming-mode-panel',
	templateUrl: './gaming-mode-panel.html',
	styleUrl: './gaming-mode-panel.scss',
	imports: [Panel, SwitchComponent, CheckboxComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamingModePanel {
	readonly value = model<GamingMode>(GAMING_MODE_DEFAULT);

	protected readonly keys: readonly SuppressedKey[] = [
		{ key: 'disableWindowsKey', label: 'Disable Windows key' },
		{ key: 'disableMenuKey', label: 'Disable Menu key' },
		{ key: 'disableAltTab', label: 'Disable ALT + Tab' },
		{ key: 'disableAltF4', label: 'Disable ALT + F4' },
	];

	protected readonly activated = computed(() => this.value().activated);
	protected readonly inGameOnly = computed(() => this.value().inGameOnly);

	protected checked(key: SuppressedKey['key']): boolean {
		return this.value()[key];
	}

	protected onActivatedChange(activated: boolean): void {
		this.value.set({ ...this.value(), activated });
	}

	protected onInGameOnlyChange(inGameOnly: boolean): void {
		this.value.set({ ...this.value(), inGameOnly });
	}

	protected onKeyChange(key: SuppressedKey['key'], checked: boolean): void {
		this.value.set({ ...this.value(), [key]: checked });
	}
}
