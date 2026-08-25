# Core journeys — acceptance criteria for the Playwright skeleton

Thin, deliberately. These six cover the group/ambience engine end to end —
the one feature that's actually finished (see `features.md` §1). Written
against the browser/mock path first, since that's what `synapse-e2e` runs
against; Tauri+fake-daemon equivalents noted where behaviour differs.
Refine as needed — a criterion that turns out wrong is cheap to fix; you
sitting idle waiting for the full inventory is not.

Source for all of this: `apps/synapse/src/app/domains/dashboard-page/`,
`core/components/{group-card,participant-card,new-group-dialog,device-dialog}`,
`core/stores/application-store.ts`, `apps/synapse/src-tauri/src/razer/state.rs`.

---

## 1. Launch with no devices present

**Setup:** mock/browser with `wired: []`, `discovered: []`, `groups: []` (or Tauri+fake daemon with zero fake devices configured).

- [ ] The dashboard loads without an error toast or console error.
- [ ] No group cards are shown.
- [ ] The "unassigned" tray is empty or shows an explicit empty state — not a broken/missing section.
- [ ] The page does not hang on a loading state — resolvers (`devicesResolver`, `groupsResolver`, `discoveredResolver`) all settle even with empty answers.
- [ ] **Known defect, don't fail the build on it, do log it:** the dashboard also calls `modulesResolver`, which under real Tauri throws because the `modules` Rust command isn't registered (see ticket 0001). Under browser/mock this is silent because the mock answers `[]`. If testing Tauri+fake daemon, expect this specific console error and no others.

## 2. Create a group

**Setup:** at least one unassigned participant available (mock default fixture, or a fake daemon device).

- [ ] Pressing "new group" (dashboard's `newGroup()`) opens a dialog asking only for a name (`new-group-dialog.ts`) — no members, no ambience picker in this step.
- [ ] Submitting a non-empty name creates the group; it appears on the dashboard, empty and **stopped**, with a still colour ambience (`still('#00ff00')` is the default set by `dashboard-page.ts`).
- [ ] Submitting an empty name is refused (the dialog's submit is disabled, and `onSubmit` no-ops on a blank/whitespace-only name) — no group is created.
- [ ] Cancelling the dialog creates nothing.
- [ ] The new group persists across a reload (Tauri+fake daemon only — written to `$XDG_CONFIG_HOME/synapse/groups.json` on every change; not applicable in browser/mock, which has no persistence).

## 3. Assign a participant to a group, and move it between groups

**Setup:** at least two groups, and either an unassigned participant or a participant already in one of the two groups.

- [ ] Dragging an unassigned participant's tile onto a group card adds it to that group.
- [ ] Dragging a participant from one group card onto a different group card moves it — it disappears from the source card and appears on the destination card. It is never a member of both at once, even momentarily in what's rendered.
- [ ] Dragging a participant from a group card onto the unassigned tray removes it from the group (does **not** delete the participant or the group).
- [ ] **Keyboard-only path, no pointer:** pressing a tile's "pick up" control, then pressing a target group's (or the tray's) "place here" control, produces the same result as the drag above. This is the accessibility path — verify it end-to-end, not just that the buttons exist.
- [ ] Attempting to move a participant into a group that already effectively holds it (dropping it back where it is) is a no-op — no error, nothing visibly changes.
- [ ] If the backend refuses (participant claimed by another group between read and write — a race, hard to trigger deliberately but worth trying with two browser tabs / two windows against the same Tauri backend if time allows): the UI surfaces a specific message naming the group that holds it, not a generic failure. (`dashboard-page.ts::#report`, the `alreadyTaken` case.)

## 4. Author an ambience (colour / motion / brightness)

**Setup:** an existing group, its card's ambience panel open (or the standalone Studio page, which is a bench with no group — verify separately, see note).

- [ ] Choosing a colour source — one fixed colour, rainbow, or a palette (list of colours) — updates the live preview immediately, with **no group required to exist and no device connected**. The preview is computed client-side.
- [ ] Choosing a motion source — still, wave, or pulse — likewise updates the preview live, independent of colour/brightness.
- [ ] Choosing a brightness source — one fixed level, or "follows the hour" (circadian) — likewise updates the preview live.
- [ ] Changing one channel does not reset or alter the other two (e.g. switching motion from still to wave does not change the chosen colour).
- [ ] Switching a channel away and back to a source restores what it was last tuned to in this session (e.g. wave's speed/width), not the channel's bare default — `ambience-panel.ts`'s `#remembered` map.
- [ ] On a group card specifically (not the Studio bench): committing an ambience change is sent to the backend and, **if the group is running, takes effect immediately without restarting it** — verify a colour or motion change is visible on a live/fake device within a second or two, no stop/start required.
- [ ] **Note for scenario design:** the Studio page (`/studio`) is explicitly a bench for authoring/previewing — it has no group and nothing there is ever sent to a device. Don't write a journey that expects Studio to apply anything; it's covered under "preview only."

## 5. Start and stop a group

**Setup:** a group with at least one real participant (Tauri+fake daemon required for the "devices themselves" checks — browser/mock can only verify UI state, not device behaviour).

- [ ] Starting a stopped group flips its state to running in the UI immediately.
- [ ] Once running, each participant's card/tile shows what it's achieving: either "full picture" (painted matrix) or "one colour" (approximated — headset, single-LED mousemat), plus an achieved rate. A device with no matrix showing "one colour" is correct behaviour, not a bug — don't flag it as one.
- [ ] Stopping a running group flips its state to stopped in the UI immediately.
- [ ] **Stopping a group does NOT go dark** — devices keep showing their last frame. This is deliberate (`stop_group` doc comment: "stopping an ambience and going dark are two different requests"). Verify the fake device's last-known state is unchanged immediately after stop, not blanked.
- [ ] A participant the engine could not reach/drive is shown with a stated reason (`skipped`/`because`), not silently absent from the group.
- [ ] **Fixed, verify it stuck:** quitting the whole application (tray Quit) used to leave every device lit — `stop_all` was documented as the real-quit path but had no caller. `backend` has since wired it in (bounded by a 5s timeout so a wedged daemon can't make Quit look broken), with a daemon-backed test pinning it. Confirm: quit the app with a group running, and the devices go dark (or hold their last-known-off state) rather than staying lit. Also confirm the group's `started` flag survives the quit — relaunching should bring the same ambience back drawing, not leave it off (quitting is not the same as stopping a group).

## 6. Delete a group

**Setup:** an existing group, at least one with members and one empty, to check both.

- [ ] The dashboard's group card has a remove control that requires a second confirming press before anything happens (`group-card.ts`'s `confirming` signal — not a single-click delete, since there's no undo).
- [ ] After confirming, the group is gone from the dashboard.
- [ ] Its former members become unassigned (visible in the tray), not deleted or orphaned invisibly.
- [ ] A running group can be deleted (verify it stops the engine for that group rather than erroring or leaving it running headless).
- [ ] **Open question, do not assume a second delete path exists:** `ux`/`po` flagged "no way to delete a group from some paths in the UI" as a known problem, but the dashboard path above does have a working delete. If your testing turns up a _different_ screen or state where deletion is unavailable and arguably should be, report it back — that's exactly the concrete repro we need to write a ticket. Don't invent a criterion for a path we haven't located yet.

---

## Cross-cutting, applies to all six

- [ ] None of the above should ever require the OpenRazer daemon to be present to _view_ the dashboard or author an ambience — only to actually drive Razer hardware. A daemon-less run (Tauri, no fake daemon started) should show groups and let ambiences be edited; only real Razer participants should report as unreachable. (`razer/state.rs::unassigned` and `groups()` no longer refuse without a daemon — this was a real, fixed bug.)
- [ ] Every group command that fails should produce a specific, readable message — not a raw stack trace or "undefined" in the UI.
