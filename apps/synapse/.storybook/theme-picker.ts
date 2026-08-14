/**
 * Free colour picker for the Storybook preview.
 *
 * Storybook toolbars only take a fixed list of items; an arbitrary input there
 * needs a *manager* addon, which is React — and React is not resolvable in this
 * workspace (it is only a transitive dependency of Storybook). Rather than pull
 * React into an Angular repository for one control, the picker is injected into
 * the preview iframe as plain DOM.
 *
 * It sits outside the story root, so `within(canvasElement)` in a `play`
 * function never sees it.
 */

const WIDGET_ID = 'syn-theme-picker';
const STORAGE_KEY = 'syn-storybook-theme-source';

export function readStoredSource(): string | null {
	try {
		return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
	} catch {
		// Private browsing, or storage disabled — the picker still works, it
		// simply forgets between reloads.
		return null;
	}
}

function storeSource(source: string): void {
	try {
		globalThis.localStorage?.setItem(STORAGE_KEY, source);
	} catch {
		/* ignore */
	}
}

type PickerOptions = {
	value: string;
	onPick: (source: string) => void;
};

/**
 * Mount once, then keep in sync. Called on every story render, so it must be
 * idempotent — Storybook re-runs decorators on navigation and on args changes.
 */
export function mountThemePicker({ value, onPick }: PickerOptions): void {
	const existing = document.getElementById(WIDGET_ID);

	if (existing) {
		const input = existing.querySelector('input');
		const label = existing.querySelector('code');
		if (input instanceof HTMLInputElement && input.value !== value) {
			input.value = value;
		}
		if (label) label.textContent = value;
		return;
	}

	const widget = document.createElement('div');
	widget.id = WIDGET_ID;
	widget.setAttribute('aria-label', 'Device colour picker');
	widget.style.cssText = [
		'position: fixed',
		'right: 12px',
		'bottom: 12px',
		'z-index: 2147483647',
		'display: flex',
		'align-items: center',
		'gap: 8px',
		'padding: 6px 10px',
		'border-radius: 8px',
		'border: 1px solid rgb(128 128 128 / 0.35)',
		'background: rgb(20 20 20 / 0.88)',
		'color: #eee',
		'font: 11px/1.4 system-ui, sans-serif',
		'box-shadow: 0 2px 10px rgb(0 0 0 / 0.35)',
	].join(';');

	const caption = document.createElement('span');
	caption.textContent = 'Device colour';

	const input = document.createElement('input');
	input.type = 'color';
	input.value = value;
	input.style.cssText =
		'width: 28px; height: 20px; padding: 0; border: 0; background: none; cursor: pointer';

	const readout = document.createElement('code');
	readout.textContent = value;
	readout.style.opacity = '0.75';

	input.addEventListener('input', () => {
		readout.textContent = input.value;
		storeSource(input.value);
		onPick(input.value);
	});

	widget.append(caption, input, readout);
	document.body.appendChild(widget);
}

export { storeSource };
