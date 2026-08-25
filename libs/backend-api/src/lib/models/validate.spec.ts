import { number, object, string } from 'valibot';
import { parsedList, parsedValue } from './validate';

/**
 * The two helpers every backend read now goes through.
 *
 * Worth their own spec because the *degrading* is the design, not an accident:
 * these decide what the interface shows when the backend answers something this
 * build cannot read, and "shows less, says so" is a choice that should break a
 * test if anyone quietly turns it into "shows nothing" or "throws".
 */

const Person = object({ name: string(), age: number() });

describe('parsedValue', () => {
	it('gives back what parsed', () => {
		expect(parsedValue(string(), 'swww', 'set_wallpaper')).toBe('swww');
	});

	it('gives back nothing, and says so, when it did not', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		expect(parsedValue(string(), 42, 'set_wallpaper')).toBeUndefined();

		// Named, so a console line is enough to find the command that drifted.
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('set_wallpaper'),
			42,
		);
		warn.mockRestore();
	});
});

describe('parsedList', () => {
	it('keeps every well-formed record', () => {
		const people = [
			{ name: 'Ada', age: 36 },
			{ name: 'Grace', age: 45 },
		];

		expect(parsedList(Person, people, 'people')).toEqual(people);
	});

	/**
	 * ⚠️ The rule the whole design rests on. One unreadable device must not cost
	 * the reader the other five — the backend already works this way, logging
	 * the peripherals it could not read and answering with the rest.
	 */
	it('keeps the good half of a bad answer', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		const kept = parsedList(
			Person,
			[{ name: 'Ada', age: 36 }, { name: 'Grace' }, 'not a person at all'],
			'people',
		);

		expect(kept).toEqual([{ name: 'Ada', age: 36 }]);
		warn.mockRestore();
	});

	it('counts what it dropped, so one odd record reads differently from a moved contract', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		parsedList(Person, [{ name: 'Ada', age: 36 }, { name: 'Grace' }], 'people');

		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('dropped 1 of 2'),
		);
		// The path, so the field that moved is named rather than guessed at.
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('age'));
		warn.mockRestore();
	});

	it('tells an answer that is not a list from a list of bad records', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		expect(parsedList(Person, null, 'people')).toEqual([]);

		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('answered null where a list was expected'),
			null,
		);
		warn.mockRestore();
	});

	it('never throws, whatever it is handed', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		// The resolvers do not await these calls, so a rejection would be an
		// unhandled promise rather than anything a reader ever sees.
		expect(() => parsedList(Person, undefined, 'people')).not.toThrow();
		expect(() => parsedValue(Person, undefined, 'person')).not.toThrow();
		warn.mockRestore();
	});
});
