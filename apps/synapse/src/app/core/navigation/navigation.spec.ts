import { locationOf } from './navigation';

describe('locationOf', () => {
	it('reads a module out of its address', () => {
		expect(locationOf('/module/twinkly')).toEqual({
			on: 'module',
			kind: 'twinkly',
		});
	});

	it('recognises the settings', () => {
		expect(locationOf('/settings')).toEqual({ on: 'settings' });
	});

	it('calls everything else home', () => {
		// Home is the fallback rather than a case of its own: the bar marks it
		// whenever nothing else is current.
		expect(locationOf('/dashboard')).toEqual({ on: 'home' });
		expect(locationOf('/')).toEqual({ on: 'home' });
		expect(locationOf('')).toEqual({ on: 'home' });
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
