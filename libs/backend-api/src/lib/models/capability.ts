/**
 * The `run_capability` wire contract — one command across every protocol.
 *
 * The Rust side routes on the request's `type`: Razer capabilities go to the
 * platform backend (DBus or REST), `Twinkly*` ones go over HTTP to the strip.
 * The caller names the device by `participant` and never learns which protocol
 * answered — see `src-tauri/src/capability.rs`, the other half of this file.
 */

/**
 * The requests the interface actually sends today.
 *
 * ⚠️ Deliberately narrower than what Rust accepts: the full Razer set
 * (`GetDpi`, `SetChromaStatic`, …) is on the wire too, and entries join this
 * union as the interface grows a caller for them — the same
 * feature-by-feature rule the mock follows (root AGENTS.md §7). Declaring the
 * lot up front would be twenty entries nothing calls and nothing mocks.
 */
export type CapabilityRequest =
	| {
			/** On is `color` mode — the stored static colour, lit. Off is off. */
			type: 'TwinklySetPower';
			args: { on: boolean };
	  }
	| {
			/**
			 * Stores `#rrggbb`, and switches a lit strip to `color` mode so the
			 * change is visible. A dark strip stays dark — power is the other
			 * control.
			 */
			type: 'TwinklySetColor';
			args: { color: string };
	  }
	| {
			/** What the strip is doing right now — answers `Lighting`. */
			type: 'TwinklyGetLighting';
	  };

/**
 * Every answer `run_capability` can give to the requests above. `Ok` is the
 * shared "done, nothing to say"; whatever the protocol, a read answers with
 * its own tagged shape.
 */
export type CapabilityResponse =
	| { type: 'Ok' }
	| {
			type: 'Lighting';
			/** `color` is `#rrggbb` — what `syn-color-picker` produces. */
			value: { on: boolean; color: string };
	  };
