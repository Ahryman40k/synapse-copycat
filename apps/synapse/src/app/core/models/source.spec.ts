import { readSources, SOURCES_DEFAULT, writeSources } from './source';

/** A `Storage` that lives in a variable, so a test can put anything in it. */
const storageOf = (initial: Record<string, string> = {}): Storage => {
	const held = new Map(Object.entries(initial));
	return {
		getItem: (key) => held.get(key) ?? null,
		setItem: (key, value) => {
			held.set(key, value);
		},
		removeItem: (key) => {
			held.delete(key);
		},
		clear: () => held.clear(),
		key: (index) => [...held.keys()][index] ?? null,
		get length() {
			return held.size;
		},
	} as Storage;
};

const KEY = 'synapse.sources';

describe('readSources', () => {
	it('starts from the defaults when nothing was saved', () => {
		expect(readSources(storageOf())).toEqual(SOURCES_DEFAULT);
	});

	it('reads back what was written', () => {
		const storage = storageOf();
		writeSources(storage, { chroma: true, twinkly: false, govee: false });

		expect(readSources(storage).twinkly).toBe(false);
	});

	it('fills in a source the saved value predates', () => {
		// ⚠️ Merged over the defaults, not taken whole. A protocol added after
		// this was written is missing from the saved object, and reading it
		// whole would leave that one `undefined` — neither on nor off.
		const storage = storageOf({ [KEY]: JSON.stringify({ chroma: false }) });

		expect(readSources(storage)).toEqual({
			...SOURCES_DEFAULT,
			chroma: false,
		});
	});

	it('falls back to the defaults on anything it cannot read', () => {
		// Storage is external input like anything else crossing a boundary: it
		// was written by an older version, or edited by hand. Falling back to
		// "everything off" would silently make the application find nothing.
		expect(readSources(storageOf({ [KEY]: 'not json' }))).toEqual(
			SOURCES_DEFAULT,
		);
		expect(
			readSources(storageOf({ [KEY]: JSON.stringify({ chroma: 'yes' }) })),
		).toEqual(SOURCES_DEFAULT);
		expect(readSources(storageOf({ [KEY]: JSON.stringify(null) }))).toEqual(
			SOURCES_DEFAULT,
		);
	});

	it('survives having no storage at all', () => {
		// A webview with storage disabled, or a private window.
		expect(readSources(undefined)).toEqual(SOURCES_DEFAULT);
		expect(() => writeSources(undefined, SOURCES_DEFAULT)).not.toThrow();
	});
});
