import {
	type Bindings,
	DEFAULT_ASSIGNMENT,
	EMPTY_BINDINGS,
	assignmentOf,
	withAssignment,
} from './key-binding';

describe('assignmentOf', () => {
	it('falls back to the default for a control nothing was said about', () => {
		expect(assignmentOf(EMPTY_BINDINGS, 'default', 'button-4')).toEqual(
			DEFAULT_ASSIGNMENT,
		);
	});

	it('keeps the two layers apart', () => {
		const bindings = withAssignment(EMPTY_BINDINGS, 'hypershift', 'button-4', {
			kind: 'disabled',
		});

		expect(assignmentOf(bindings, 'hypershift', 'button-4').kind).toBe(
			'disabled',
		);
		expect(assignmentOf(bindings, 'default', 'button-4').kind).toBe('default');
	});
});

describe('withAssignment', () => {
	it('records an assignment without touching the original', () => {
		const before: Bindings = EMPTY_BINDINGS;
		const after = withAssignment(before, 'default', 'button-4', {
			kind: 'mouse',
			action: 'back',
		});

		expect(after.default['button-4']).toEqual({
			kind: 'mouse',
			action: 'back',
		});
		expect(before.default).toEqual({});
	});

	it('drops the entry when a control goes back to its default', () => {
		const assigned = withAssignment(EMPTY_BINDINGS, 'default', 'button-4', {
			kind: 'disabled',
		});
		const reset = withAssignment(assigned, 'default', 'button-4', {
			kind: 'default',
		});

		// A default is the absence of an assignment, not one of its own: storing
		// it would make "has been changed" impossible to tell, which is what the
		// dot beside a control reads.
		expect(reset.default).toEqual({});
		expect(Object.keys(reset.default)).toHaveLength(0);
	});

	it('leaves the other layer alone', () => {
		const bindings = withAssignment(EMPTY_BINDINGS, 'default', 'left', {
			kind: 'disabled',
		});
		const both = withAssignment(bindings, 'hypershift', 'left', {
			kind: 'text',
			text: 'gg',
		});

		expect(both.default['left']).toEqual({ kind: 'disabled' });
		expect(both.hypershift['left']).toEqual({ kind: 'text', text: 'gg' });
	});
});
