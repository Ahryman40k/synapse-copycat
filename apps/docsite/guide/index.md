# Getting started

## What you need

Synapse talks to Razer hardware through the **OpenRazer** daemon. Install it
from your distribution, add yourself to the `plugdev` group, and log back in.

You do **not** need hardware to run the application — see
[without a device](#without-a-device) below.

## Running it

```sh
pnpm install
pnpm exec nx run synapse:tauri     # the desktop application
pnpm exec nx serve synapse         # the interface alone, in a browser
```

The browser command needs no daemon and no device: it runs against an in-memory
backend with a few invented peripherals. It is how most of the interface is
built.

## Your first group

On a first run, everything found goes into one group called **All devices**,
already drawing. There is nothing to set up before something happens.

From there:

- **Change the ambience** — open the group's settings from the line under the
  preview. Pick a colour source, a motion and a brightness; the preview follows
  as you go.
- **Rename it** — click the title.
- **Stop it** — the switch at the top right. Stopping leaves the last frame on
  the devices; going dark is a different request.

## Making another group

The **New group** button at the bottom of the dashboard asks for a name and
nothing else. It arrives empty and stopped — what goes in it and whether it
draws are the next two decisions, and both are one gesture away on the card that
just appeared.

## Moving devices between groups

Drag a device's tile onto another group. Dropping it into the tray at the bottom
takes it out of every group, which is a legitimate arrangement — an unlit
keyboard while the rest of the desk breathes.

**Without a pointer:** every tile has a small handle. Press it to pick the
device up, then press **Place here** on the group you want. The platform offers
no keyboard equivalent for dragging, so this is not a convenience — without it
the feature would exist only for people holding a mouse.

## Looking at one device

Click a tile. The dialog shows what the device is, what the engine is making of
it — `In Desk, showing the full picture at 30 Hz` — and its own settings page.

## Without a device

Two ways, both real:

**In a browser.** `nx serve synapse` runs the whole interface against an
in-memory backend. Every feature has to work there; it is the primary
development mode.

**Against a fake daemon.** OpenRazer ships a fake driver, and the repository has
a script that runs the real daemon against it — no hardware, no kernel module,
no root:

```sh
apps/synapse/src-tauri/scripts/openrazer-fake.sh start
pnpm exec nx run synapse:tauri
```

⚠️ A fake device says yes to everything. It proves the shape of the calls and
the capability discovery — never the latency, the firmware, the wireless link,
or what a frame actually looks like.
