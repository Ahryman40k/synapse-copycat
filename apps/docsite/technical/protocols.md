# The protocol libraries

Each protocol is a Rust library in `libs/`, usable on its own. They know about
their hardware and nothing about groups, ambiences or this application: the
adapter that makes a device a participant lives in the application.

That is deliberate. An abstraction drawn from one example is a guess, and the
one that spans Razer, Twinkly and Govee will be extracted from working
implementations rather than designed ahead of them.

## `libs/openrazer`

One trait, two implementations chosen at compile time: **DBus on Linux**, the
REST bridge on Windows. Every caller above it is written once.

It covers the daemon's interfaces — devices, matrices, DPI, brightness, battery,
power.

## `libs/twinkly`

Twinkly light strings, over their local network API.

⚠️ **The protocol is not documented by the vendor.** Everything here comes from
the community's reverse engineering at
[xled-docs](https://xled-docs.readthedocs.io), checked against a real device
where it could be.

### Discovery, and why a broadcast is not enough

A Twinkly answers `\x01discover` on UDP port 5555 with its address, `OK` and its
name.

The reply puts **the four address bytes in reverse order**. Read forwards,
`c9 01 a8 c0` gives `201.1.168.192` — a perfectly plausible address on someone
else's network. The kind of wrong that does not announce itself.

The library sends a broadcast **and** sweeps the subnet with unicast probes.
That is not belt and braces. Measured on a WSL2 host in `mirrored` networking
mode, with a real address on the LAN: a broadcast to `x.x.x.255:5555` gets no
reply at all, while the identical datagram sent straight to the device is
answered every time. Any interface behind a NAT, a bridge or a firewall that
drops broadcast looks the same — and a discovery that only broadcasts reports
"no devices" on a network full of them.

The sweep costs 254 datagrams of nine bytes.

### Identity

A participant is keyed by **MAC**, not by address: a device that takes a new
lease overnight is the same device, and a group that named it by address would
quietly lose it.

### What works, and what to know

Discovery, `gestalt`, **authentication** (the challenge login, a token the
device expires after four hours, one re-login on a 401), **static control**
(`led/mode`, `led/color` — the strip's page can light it, darken it and set its
one colour) and **real-time mode** (v3 datagrams on UDP port 7777, generation
II firmware 2.4.14+) are written. A Twinkly in a group is driven like any other
participant: the ambience is composed across the string's LEDs and streamed as
frames, with the engine's usual per-device pacing.

Three behaviours worth knowing:

- Frames are sent even when nothing changed — they are what keeps the device
  in rt mode, and `rt` is re-asserted over HTTP every few seconds so an
  expired token or a device that wandered back to movie mode heals itself.
- A stopped group leaves the strip showing the last frame's **average** as its
  static colour: rt mode cannot "keep the last frame" the way a Razer device
  does, because the device abandons it once frames stop.
- ⚠️ None of this has been verified against a real device yet — it is written
  to xled-docs, and the first run in Tauri mode is the check.

## Adding another

Govee, Hue and Nanoleaf are the next candidates. The shape is the same: a crate
in `libs/`, a pure protocol client, a test suite that does not need the network,
and an example that does.
