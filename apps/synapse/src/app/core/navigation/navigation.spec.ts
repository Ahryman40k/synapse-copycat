import { locationOf } from './navigation';

describe('locationOf', () => {
	it('reads a module out of its address', () => {
		expect(locationOf('/module/twinkly')).toEqual({
			on: 'module',
			kind: 'twinkly',
		});
	});

	it('recognises every fixed place', () => {
		// Matched against the table the bar renders from, so a page added there
		// is recognised here without anyone remembering to come back.
		expect(locationOf('/settings')).toEqual({ on: 'settings' });
		expect(locationOf('/studio')).toEqual({ on: 'studio' });
		expect(locationOf('/backgrounds')).toEqual({ on: 'backgrounds' });
		expect(locationOf('/dashboard')).toEqual({ on: 'home' });
	});

	it('calls everything else home', () => {
		expect(locationOf('/')).toEqual({ on: 'home' });
		expect(locationOf('')).toEqual({ on: 'home' });
		expect(locationOf('/nowhere')).toEqual({ on: 'home' });
	});

	it('ignores the query string', () => {
		expect(locationOf('/module/twinkly?tab=lighting')).toEqual({
			on: 'module',
			kind: 'twinkly',
		});
	});

	it('has no address for a device any more', () => {
		// ⚠️ A device is not a place. It is inspected in a dialog over the
		// dashboard, where it already sits — the per-device pages and their
		// routes are gone. An old bookmark lands on home rather than on a blank.
		expect(locationOf('/device/mouse/5426-0136')).toEqual({ on: 'home' });
	});
});
