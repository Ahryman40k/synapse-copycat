# What it does

This page is a status report, not a brochure. Everything marked **working** has
automated coverage; everything else says what is missing.

## At a glance

| Capability                                | State                                                       |
| ----------------------------------------- | ----------------------------------------------------------- |
| Enumerate Razer devices                   | ✅ Working (OpenRazer, DBus on Linux)                       |
| Groups: create, rename, remove            | ✅ Working, saved across restarts                           |
| Move a participant between groups         | ✅ Working, by drag or without a pointer                    |
| Ambiences: colour, motion, brightness     | ✅ Working, composed and previewed live                     |
| Paint a device's matrix                   | ✅ Working, dirty rows only                                 |
| Per-device pacing when one cannot keep up | ✅ Working, and reported                                    |
| Interface colour follows the hardware     | ✅ Working, from the first group                            |
| Discover Twinkly light strings            | ✅ Working — they appear in the device list                 |
| Twinkly: lit/dark and one static colour   | ⚠️ New — written to xled-docs, unverified on a real strip   |
| **Drive** a Twinkly from an ambience      | ⚠️ New — real-time frames over UDP, same caveat             |
| Govee, Hue, Nanoleaf                      | ❌ Not started                                              |
| Per-device settings (DPI, key bindings)   | ⚠️ Interface only — see below                               |
| Device list follows plug and unplug       | ⚠️ New — DBus signals for Razer, a gated poller for Twinkly |
| Live refresh of achieved frame rates      | ❌ Not yet — the figures update on reload                   |

## Groups and ambiences

A **group** holds participants and one **ambience**. On a first run everything
found goes into a single group that is already drawing, so the application does
something the moment it opens.

An ambience is three independent channels:

- **Colour** — one fixed colour, or a rainbow across the strip. A third,
  authored in the effect studio, is planned.
- **Motion** — still, a wave travelling round, or a pulse.
- **Brightness** — one level, or one that follows the hour.

They compose rather than override. A rainbow can travel as a wave while the
hour dims the whole thing; none of the three has to win, because they are not
answering the same question.

Every card shows a **live preview** of its ambience, computed in the interface
itself — so it works before any device is connected, and before a daemon is
running.

## What each device makes of it

Not every device can show a picture. A keyboard has a matrix; a mousemat may be
a single LED; a headset has no matrix at all. A group tells you which is which,
per device:

```
Huntsman Elite      full picture   30 Hz · 7.8 ms
Goliathus           one colour     30 Hz · 1.2 ms
Basilisk Ultimate   full picture    8 Hz · 24.6 ms
```

**"One colour" is not a failure.** An averaged colour is the whole of what a
single-LED device can show. And the third line is a device that cannot afford
every tick, so it takes every fourth and runs at a quarter of the rate — _on its
own_, without slowing the two beside it. That is why the achieved rate is shown
and not the requested one.

## Cadence

A group asks for **slow (10 Hz)**, **normal (30 Hz)** or **fast (60 Hz)**. It is
a request, not a promise: each device keeps up or paces itself, and the figures
above say which happened.

## The interface takes the hardware's colour

The application's own palette is derived from the colour of the first group.
The chosen colour contributes **hue and chroma only — never lightness**, which
is what keeps every piece of text above the WCAG contrast floor whatever colour
the hardware reports. A pale green does not wash the interface out; it is
tone-mapped.

Because only the _colour_ channel is read, a pulsing ambience does not make the
interface breathe and a circadian one does not make it drift all day.

## ⚠️ Per-device settings do not reach the hardware

The per-device pages for Razer devices — DPI, polling rate, key bindings,
lighting effects — are **interface only**. Every control writes to application
state and nothing else: not one of them calls the backend. They are a design
that is built and not yet wired.

The one exception is the **strip page**: its switch and colour go over the wire
to the Twinkly, and what it shows was read back from the device.

What _does_ reach the hardware is the group's ambience. That path is complete.
