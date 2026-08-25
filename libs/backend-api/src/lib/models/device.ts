import { type InferOutput, number, object, picklist, string } from 'valibot';

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

/**
 * The kinds an enumeration answer may carry — seven of the eight above.
 *
 * ⚠️ **`strip` is excluded, and `streaming` is not**, which looks inconsistent
 * until you ask where each one comes from.
 *
 * `strip` is invented by `toStrip` in the store, from a `twinkly_devices`
 * answer. Nothing on the `devices` wire can legitimately say `strip`, so
 * accepting it here would only ever wave through a mistake.
 *
 * `streaming` is different: `razer::device::DeviceKind` cannot emit it —
 * `#[serde(rename_all = "snake_case")]` over six variants, and a Kiyo is mapped
 * to `unknown` — but the *contract* declares it deliberately, and the browser
 * path produces it so the camera page can be built at all. Narrowing this to
 * the six Rust variants would have been more faithful to today's daemon and
 * would have dropped the Kiyo out of every mock silently, which is the failure
 * a validator is supposed to prevent rather than cause.
 */
export const WireDeviceKind = picklist([
	'mouse',
	'keyboard',
	'mousemat',
	'headset',
	'accessory',
	'unknown',
	'streaming',
]);
export type WireDeviceKind = InferOutput<typeof WireDeviceKind>;

/**
 * One enumerated Razer device, exactly as `commands.rs::devices` serialises it.
 *
 * The mirror of `razer::device::Device`. Snake_case because that is what serde
 * writes and nothing renames it — the domain `Device` above is what the rest of
 * the application sees, and `toDevice` in the store is the one place that turns
 * one into the other.
 *
 * ⚠️ Rust also sends an `image` field. It is deliberately absent here: the
 * interface builds its own path from the ids, and valibot's `object` ignores
 * what it was not asked about, so a field the backend adds never breaks a
 * build that does not want it.
 */
export const WireDevice = object({
	/**
	 * ⚠️ **The identifier**, and the one the rest of the backend names a
	 * participant by — groups list their members by serial. See the note on
	 * `BackendCommands['devices']` for what building it out of
	 * `vendor_id-product_id` cost.
	 */
	serial: string(),
	kind: WireDeviceKind,
	vendor_id: number(),
	product_id: number(),
	name: string(),
});
export type WireDevice = InferOutput<typeof WireDevice>;
