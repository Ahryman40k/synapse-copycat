# The rendering engine

The engine lives in the Rust process, not in the webview, and that is the whole
reason it exists. A loop that has to produce a frame every 33 ms cannot share a
thread with an interface that repaints when someone opens a menu — and it has to
keep running when the window is closed.

## Three channels

An ambience is three sources, chosen independently:

```rust
Ambience {
    colour:     Fixed { rgb } | Rainbow { … } | Palette { colours, turns_per_second },
    motion:     None | Wave { laps_per_second, width } | Pulse { period },
    brightness: Fixed { level } | Circadian { day, night },
}
```

Composition is a product, not a priority list: the colour says _what hue_, the
motion says _how much of it, here, now_, and the brightness scales the result.
Nothing has to win, because the three are not answering the same question.

Two details that took measuring:

- **A wave divides by the column count, not by `columns - 1`.** Positions then
  sit at `0, 1/n … (n-1)/n`, so the step from the last column back to the first
  is the same as every other and the band does not hesitate once a lap.
- **Distance is measured the short way round.** Measuring it the long way leaves
  a dark seam crossing the strip once per lap.

## Cadence, and devices that cannot keep up

A group asks for slow (10 Hz), normal (30 Hz) or fast (60 Hz). Each device is
measured against the budget that rate allows.

A device that costs more than its share **skips ticks of its own accord** rather
than slowing the group. A mouse taking 24 ms a frame draws every fourth tick and
runs at 7.5 Hz while the keyboard beside it holds 30. The interface reports the
achieved rate for exactly this reason: a quarter-speed device is not broken, and
you cannot see the difference without being told.

## Painting only what moved

A frame is compared with the last one sent and only the rows that differ are
written. On a keyboard that is usually a handful of rows out of nine.

Devices with no matrix are **approximated**: the frame is averaged to one colour
and sent as a static colour. A headset and a single-LED mousemat both take this
path, and it is not a degraded mode — it is the whole of what they can show.

## Groups

A participant belongs to **at most one group**. Two engines painting one device
would each keep undoing the other, so the rule is enforced in the backend and
the refusal names the group already holding it — which is what lets the
interface offer to move it rather than only saying no.

Groups are written to `$XDG_CONFIG_HOME/synapse/groups.json` on every change,
through a temporary file and a rename, so a crash mid-write leaves the previous
configuration intact. A file that exists and cannot be read is **not** treated as
a first run: starting fresh would silently throw away a configuration someone
built.

## The compositor exists twice, deliberately

The Rust compositor paints hardware. A second one in TypeScript draws the
previews.

That is not an oversight. Sending frames across the IPC thirty times a second to
fill a row of coloured boxes would be absurd, and a preview that needs a running
daemon is no use before anything is set up. The duplication is kept honest by
asserting the **same properties on both sides, under the same test names**: a
still ambience is uniform, a wave wraps without a seam, circadian bottoms at
midnight, the three channels compose.

## ⚠️ What is not settled

The engine paints through `openrazer::DeviceBackend`, which couples it to one
protocol. The abstraction that replaces it will be extracted once a second
protocol can actually be driven — from two working implementations rather than
guessed from one.
