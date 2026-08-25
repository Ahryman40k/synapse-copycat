# Tickets

One file per ticket, kept in full whether or not the work happened. This index
is generated from the ticket files; each ticket is always the authority for its
own detail.

**For what actually shipped, read [the plan](../plan) instead.** It records the
outcome of every ticket in one table. Status is deliberately not repeated here —
two places to look is two places to drift.

Nothing in these files is an instruction to anyone. The team that wrote them has
stood down.

| #     | Ticket                                                                                                                         | Owner                                      |
| ----- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| 0001  | [Remove the `modules` command and its dead TS concept](./0001-modules-command-crash)                                           | RESOLVED by the maintainer — this is a st… |
| 0002  | [Live per-device status figures never refresh without a reload](./0002-live-status-refresh)                                    | frontend                                   |
| 0003  | [Turn on the two valibot schemas that already exist and are never called](./0003-turn-on-existing-validators)                  | frontend                                   |
| 0004  | ["No devices found" conflates three different situations, and one may fail silently](./0004-no-daemon-devices-fail-silently)   | frontend                                   |
| 0005  | [Delete the generated-bindings directory and its tooling](./0005-delete-generated-bindings)                                    | RESOLVED by the maintainer                 |
| 0006  | [Capability discovery: the UI knows what a device can do](./0006-capability-discovery)                                         | built by `backend`, in the tree, not comm… |
| 0007  | [Wire DPI (mouse → performance → sensitivity)](./0007-wire-dpi)                                                                | frontend                                   |
| 0007a | [DPI staging: the preset list, ships now](./0007a-dpi-staging-preset-list)                                                     | frontend — per the Track B re-scoping, th… |
| 0007b | [DPI staging: button-bound cycling](./0007b-dpi-staging-button-cycling)                                                        | blocked on a feasibility answer, not mere… |
| 0008  | [Wire brightness end to end (mouse/keyboard/mousemat lighting)](./0008-wire-brightness)                                        | frontend only. **Re-owned per the lead**:… |
| 0009  | [Wire the Chroma hardware effects (static/spectrum/wave/breathe)](./0009-wire-chroma-effects)                                  | frontend only. **Re-owned per the lead**:… |
| 0010  | [Wire the battery gauge (mouse page)](./0010-wire-battery)                                                                     | frontend only. **Re-owned per the lead**:… |
| 0011  | [Reconnect to OpenRazer if it starts or restarts after the app](./0011-daemon-reconnect)                                       | backend.                                   |
| 0012  | [A first run never writes its groups to disk](./0012-first-run-not-persisted)                                                  | backend.                                   |
| 0013  | [One error shape across all eight group commands](./0013-unify-group-error-shape)                                              | awaiting `frontend`'s confirmation of the… |
| 0014  | [Darkening a device that has no `SetChromaStatic` silently does nothing](./0014-darken-fails-on-devices-without-static-chroma) | backend, in flight.                        |
| 0015  | [The lighting-switch-off panel: awaiting maintainer decision](./0015-remove-dead-lighting-switch-off-panel)                    | awaiting maintainer decision — not ready … |
| 0016  | [The circadian ambience preview can't show anything but noon](./0016-circadian-preview-pinned-to-noon)                         | frontend.                                  |
| 0017  | [Wire polling rate (mouse → performance)](./0017-wire-polling-rate)                                                            | backend                                    |
| 0018  | [Wire gaming mode (keyboard → customize)](./0018-wire-gaming-mode)                                                             | —                                          |
| 0019  | [Wire key/button rebinding (mouse + keyboard → customize)](./0019-wire-key-bindings)                                           | backend                                    |
| 0020  | [Per-device control state resets when you switch tabs](./0020-tab-switch-state-loss)                                           | frontend.                                  |
| 0021  | [Wire wireless power saving (mouse → power)](./0021-wire-wireless-power-saving)                                                | backend                                    |
| 0022  | [`enforce-module-boundaries` is installed and enforces nothing](./0022-module-boundary-tags)                                   | frontend to propose the tag taxonomy; nee… |
| 0023  | [The application identifier blocks packaging entirely](./0023-app-identifier-blocks-packaging)                                 | awaiting maintainer decision               |
