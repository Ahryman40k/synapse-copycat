import type { BackendCommands } from './backend-commands';

/**
 * What the backend pushes without being asked — Tauri events, by name.
 *
 * Each payload is exactly what the matching command answers, so the handler
 * that reads an event is the handler that reads a fetch, and neither side
 * invents a second shape for the same fact.
 *
 * The names are snake_case like the commands: they are Rust-side constants
 * (`src-tauri/src/watch.rs`), and one convention across both channels beats
 * two.
 */
export type BackendEvents = {
	/**
	 * OpenRazer hotplug — a device arrived or left, and this is the fresh
	 * list. Forwarded from the daemon's DBus signals, so it only ever fires
	 * in Tauri mode on Linux.
	 */
	devices_changed: BackendCommands['devices']['returnType'];

	/**
	 * A watch sweep found the network changed. Fires only while the Twinkly
	 * poller is on (`watch_twinkly`), and only when the list actually
	 * differs from the last one announced.
	 */
	twinkly_devices_changed: BackendCommands['twinkly_devices']['returnType'];
};
