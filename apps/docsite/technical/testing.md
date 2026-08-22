# How it is verified

Four suites, each covering something the others structurally cannot.

| Suite                           | Runs in       | Catches                                 |
| ------------------------------- | ------------- | --------------------------------------- |
| `nx run-many -t test`           | jsdom         | logic, state, component behaviour       |
| `nx run synapse:test-storybook` | real Chromium | layout, focus, drag, computed styles    |
| `cargo test`                    | native        | the engine, the compositor, persistence |
| the fake daemon                 | native + DBus | the Rust ↔ OpenRazer conversation       |

## Why Storybook is a second suite

jsdom has no layout. Every measurement it reports is `0`, so a test asserting
that two cards are the same height passes against a page where they are not.
Anything about size, position, focus or computed style is asserted in a story,
which runs in a real browser.

That is not theoretical. Writing those assertions caught two of _this_
project's own tests measuring nothing at all — a grid stretches its items
whatever happens inside them, so measuring the item proved nothing and the
painted box had to be measured instead.

**Every layout assertion here was checked against the code without its fix.** An
assertion that passes either way is worse than no assertion, because it reads
like cover.

## The mock is a contract, not a convenience

`Mock` is derived from the command contract and is deliberately **not** partial.
Adding a backend command turns every incomplete mock into a compile error, which
is how a new command finds the places that have to answer it.

Two rules the mock has learned the hard way:

- **It refuses in the same shape the backend refuses.** It used to throw a
  message where the real backend rejects with a structured error, so the
  interface's "offer to move it" path worked in Tauri and nowhere else.
- **It never mutates what it hands out.** The real backend reserialises on every
  read, so nothing downstream ever sees the same object twice. Mutating in place
  handed Angular an unchanged group inside a changed status, a `computed`
  short-circuited, and a membership changed while the count beside it did not.

Both are the exact class of drift a mock exists to prevent, and both were found
by tests rather than by reading.

## The fake daemon

OpenRazer ships a fake driver. `scripts/openrazer-fake.sh` runs the _real_
daemon against it — no hardware, no kernel module, no root:

```sh
apps/synapse/src-tauri/scripts/openrazer-fake.sh start
```

This is what made the Rust backend developable at all, and it immediately found
a set of lighting, DPI and battery calls that had been silently misnamed.

⚠️ A fake device says yes to everything. It proves the shape of the calls and
the capability discovery — never the latency, the firmware, the wireless link,
or what a frame actually looks like.

## Tests that need something absent

Anything needing the daemon or a device on the network is **ignored by default**
rather than failing. A suite that fails on a machine with nothing plugged in
teaches people to ignore it, and then it stops catching anything.

Twinkly discovery is an `example` for the same reason:

```sh
cargo run -p twinkly --example discover
```
