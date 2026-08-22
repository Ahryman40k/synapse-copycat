import {
	type InferOutput,
	boolean,
	object,
	optional,
	parse,
	safeParse,
} from 'valibot';

/**
 * Where participants can come from.
 *
 * One switch per protocol, because each costs something different to look for:
 * Chroma is a DBus call to a daemon that is either there or not, Twinkly is a
 * sweep of the whole subnet, and a machine on a large or hostile network has
 * good reason to say no to the second without saying no to the first.
 */
export type Source = 'chroma' | 'twinkly' | 'govee';

export const Sources = object({
	chroma: boolean(),
	twinkly: boolean(),
	govee: boolean(),
});
export type Sources = InferOutput<typeof Sources>;

/**
 * ⚠️ `govee` is off and stays off: nothing implements it. A switch that turns
 * on something that does not exist is worse than one that says so, which is why
 * the panel shows it disabled rather than hiding it — the plan is visible and
 * the promise is not made.
 */
export const SOURCES_DEFAULT: Sources = {
	chroma: true,
	twinkly: true,
	govee: false,
};

/** Sources with no implementation behind them. */
export const SOURCES_UNAVAILABLE: readonly Source[] = ['govee'];

/** How each one is named to the reader. */
export const SOURCE_LABELS: Record<Source, string> = {
	chroma: 'Razer Chroma',
	twinkly: 'Twinkly',
	govee: 'Govee',
};

export const SOURCE_DETAILS: Record<Source, string> = {
	chroma: 'Peripherals reported by the OpenRazer daemon.',
	twinkly: 'Light strings found by sweeping the local network.',
	govee: 'Not implemented yet.',
};

const STORAGE_KEY = 'synapse.sources';

/**
 * Read the saved choice.
 *
 * ⚠️ Parsed, not cast. What comes out of storage is external input like
 * anything crossing a boundary (root AGENTS.md §6): it was written by an older
 * version, or edited, or is not JSON at all. A bad value falls back to the
 * defaults rather than throwing, because a preference is not worth refusing to
 * start over — and the fallback is `SOURCES_DEFAULT`, not "everything off",
 * which would silently make the application find nothing.
 */
export function readSources(storage: Storage | undefined): Sources {
	const saved = storage?.getItem(STORAGE_KEY);
	if (!saved) return SOURCES_DEFAULT;

	try {
		const parsed = safeParse(
			object({
				chroma: optional(boolean()),
				twinkly: optional(boolean()),
				govee: optional(boolean()),
			}),
			JSON.parse(saved),
		);

		// Merged over the defaults rather than replacing them: a source added
		// after this was written is missing from the saved object, and taking
		// the saved object whole would leave it `undefined`.
		return parsed.success
			? { ...SOURCES_DEFAULT, ...parsed.output }
			: SOURCES_DEFAULT;
	} catch {
		return SOURCES_DEFAULT;
	}
}

/** Save it. Failure is ignored: a preference is not worth an error dialog. */
export function writeSources(
	storage: Storage | undefined,
	sources: Sources,
): void {
	try {
		storage?.setItem(STORAGE_KEY, JSON.stringify(parse(Sources, sources)));
	} catch {
		// Private browsing, a full quota, a webview with storage disabled — the
		// choice simply does not survive the session.
	}
}
