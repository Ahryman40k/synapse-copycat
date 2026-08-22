/**
 * Something the application can show and, one day, drive.
 *
 * ⚠️ `strip` is not a Razer kind. It arrived with Twinkly, which is the first
 * participant that reaches the application over the network rather than over
 * DBus — and the reason the identifier is opaque: nothing outside the backend
 * may read it to work out what protocol it belongs to.
 */
export type Device = {
	__type: 'device';
	/**
	 * ⚠️ Must cover everything the Rust `DeviceKind` can emit, and it did not:
	 * `headset` and `unknown` are what the daemon reports for a Kraken and for
	 * anything it does not recognise, and neither was declared here. A kind
	 * nothing matches is not fatal — the detail dialog simply has no page for it
	 * — but it was invisible, because the mock only ever produced kinds this
	 * list already had.
	 *
	 * `streaming` is the exception in the other direction: the contract carries
	 * it for the Kiyo and the Rust side never emits it, mapping that device to
	 * `unknown` instead.
	 *
	 * `strip` arrived with Twinkly — the first participant that reaches the
	 * application over the network rather than over DBus.
	 */
	kind:
		| 'mouse'
		| 'keyboard'
		| 'mousemat'
		| 'headset'
		| 'accessory'
		| 'unknown'
		| 'streaming'
		| 'strip';
	visual: string;
	id: string;
	name: string;
};
