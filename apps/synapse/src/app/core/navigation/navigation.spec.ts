import { locationOf } from './navigation';

describe('locationOf', () => {
	it('reads a device out of its address', () => {
		expect(locationOf('/device/mouse/5426-0136')).toEqual({
			on: 'device',
			id: '5426-0136',
		});
	});

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
		expect(locationOf('/device/mouse/5426-0136?tab=lighting')).toEqual({
			on: 'device',
			id: '5426-0136',
		});
	});

	it('does not call a device page a device without its id', () => {
		// `/device/mouse` names a kind and nothing to open.
		expect(locationOf('/device/mouse')).toEqual({ on: 'home' });
	});
});
