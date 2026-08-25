import {
	type BaseIssue,
	type BaseSchema,
	getDotPath,
	type InferOutput,
	safeParse,
} from 'valibot';

/**
 * Parsing what the backend answered, on the rule root AGENTS.md §6 states: the
 * static type is a lie until something has checked it.
 *
 * ⚠️ **Nothing here throws.** Every caller is a store method the interface
 * fires and forgets — the route resolvers do not await `getDevices`, and a
 * rejection there is an unhandled promise, not an error anyone sees. So a bad
 * answer degrades to "nothing found", which every screen already knows how to
 * show, and says so on the console. The alternative is a blank window with a
 * red line in a log nobody opened.
 *
 * ⚠️ And nothing here is silent. Dropping a malformed record without a word is
 * how a contract drifts for weeks: the interface looks like it is working and
 * is quietly showing less than the backend sent. Every drop is counted and
 * named.
 */

/** Any schema, whatever it parses — the shape valibot's own helpers take. */
type AnySchema = BaseSchema<unknown, unknown, BaseIssue<unknown>>;

/** `palette.2: Expected the #rrggbb form`, or just the message at the root. */
function describe(issue: BaseIssue<unknown>): string {
	const path = getDotPath(issue);
	return path ? `${path}: ${issue.message}` : issue.message;
}

/**
 * Parse one answer, or give back `undefined` and say why.
 *
 * For the commands that answer a single value. A list is `parsedList`, which
 * can keep the good half of a bad answer where this can only take it or leave
 * it.
 */
export function parsedValue<TSchema extends AnySchema>(
	schema: TSchema,
	value: unknown,
	what: string,
): InferOutput<TSchema> | undefined {
	const result = safeParse(schema, value);
	if (result.success) return result.output;

	console.warn(
		`[synapse] ${what} answered in a shape this build does not read — ${describe(result.issues[0])}`,
		value,
	);
	return undefined;
}

/**
 * Parse a list, keeping whatever is well-formed.
 *
 * ⚠️ **Per item, not all-or-nothing**, and that is the whole design. One
 * unrecognised device must not cost the reader the other five: the backend
 * already works this way — `commands.rs::enumerate` logs the peripherals it
 * could not read and answers with the rest — and an interface that threw the
 * lot away on one bad record would be stricter than the thing it is reading.
 *
 * An answer that is not a list at all is a different failure, and gets its own
 * word: that is the contract being wrong, not one record being odd.
 */
export function parsedList<TSchema extends AnySchema>(
	schema: TSchema,
	value: unknown,
	what: string,
): InferOutput<TSchema>[] {
	if (!Array.isArray(value)) {
		console.warn(
			`[synapse] ${what} answered ${value === null ? 'null' : typeof value} where a list was expected`,
			value,
		);
		return [];
	}

	const kept: InferOutput<TSchema>[] = [];
	const dropped: string[] = [];

	for (const item of value) {
		const result = safeParse(schema, item);
		if (result.success) {
			kept.push(result.output);
		} else {
			dropped.push(describe(result.issues[0]));
		}
	}

	if (dropped.length) {
		// The count first, because "3 of 8" is the number that says whether
		// this is one odd record or the contract having moved underneath us.
		console.warn(
			`[synapse] dropped ${dropped.length} of ${value.length} from ${what} — ${dropped.join('; ')}`,
		);
	}

	return kept;
}
