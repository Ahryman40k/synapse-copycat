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

### ⚠️ What is missing

Discovery and `gestalt` work; a Twinkly appears in the device list and can be
put into a group, where it is reported as one the engine could not drive. What
is not written yet:

- **Authentication** — a token obtained by a challenge and renewed periodically.
- **Real-time mode** — frames pushed over UDP on port 7777.

Until those exist, a Twinkly is visible and not drivable, and the interface says
so rather than pretending.

## Adding another

Govee, Hue and Nanoleaf are the next candidates. The shape is the same: a crate
in `libs/`, a pure protocol client, a test suite that does not need the network,
and an example that does.
