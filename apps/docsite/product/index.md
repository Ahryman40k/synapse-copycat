# Product documentation — entry point

Written for the maintainer, at the end of a work round on branch
`10-integrate-ai`. Per the maintainer's own direction, the team has stopped
building and this is now documentation, not a work queue: everything the
application handles, what happened this round, and everything still
waiting on a decision only the maintainer can make.

## Read in this order

1. **[`features.md`](./features.md)** — the authoritative inventory.
   Every feature the application has, whether it works in the browser/mock
   path, under Tauri with the fake daemon, and on real hardware. This is
   the thing to read if the question is "what does this app actually do
   today" — start here.
2. **[`open-decisions.md`](./open-decisions.md)** — everything specifically
   waiting on the maintainer, one list, each with the facts and a
   non-binding recommendation where one exists: a live, unresolved
   disagreement over DPI staging (remove it, or keep it as an
   application-owned feature — `po` and `ux` hold different positions,
   deliberately not settled by either of them), the lighting-switch-off
   panel, the app identifier blocking packaging, the `Surface` protocol
   abstraction, the CLI channel, three CLAUDE.md corrections, and several
   findings and open product questions from `ux`'s backgrounds and studio
   redesigns. If there's one page to act on, it's this one.
3. **[`plan.md`](./plan.md)** — the backlog as it stood when work stopped:
   what shipped, what was scoped but never started, and the final status of
   every numbered ticket. Read this for the "why" behind a half-finished
   thread, or before resuming any of it.
4. **[`journeys.md`](./journeys.md)** — the acceptance criteria for the six
   core journeys against the group/ambience engine, the part of the
   application found to be genuinely finished. `qa`'s Playwright suite was
   built directly from this.
5. **[`tickets/`](./tickets/)** — one file per ticket, kept in full even
   where nothing was built, so whoever resumes work has the complete
   context rather than a one-line backlog entry.

## Where the other teams' work sits

- **[Design](/design/)** — `ux`'s work: personas, user flows, wireframes,
  usability findings, an accessibility audit, and the two flows the
  maintainer asked to be redesigned directly (background management, the
  effect studio). Start with `/design/` itself, which has its own reading
  order and leads with the three findings that matter most.
- **[QA](/qa/report)** — the test baseline across all three modes this
  machine can exercise, what mode 3 (real hardware) would still need to
  confirm, and the Playwright suite built from `journeys.md`.
- **[Technical — backend handover](/technical/backend-handover)** —
  `backend`'s account of the engine, the protocol boundary, and everything
  found while building capability discovery, written for whoever picks the
  Rust side back up.

## The headline, if only one thing gets read

The group/ambience engine — groups, the three-channel ambience model,
painting a device's matrix or approximating on hardware that can't, Twinkly
discovery and driving, wallpaper-palette-to-group — is **done**: wired end
to end, tested on both sides, working in all three modes. That is the part
of this application that matches the stated goal (a Linux app managing room
ambience across Razer Chroma and Twinkly). Everything else — the five
per-device "Synapse clone" pages — was scaffolding from an earlier
direction, confirmed almost entirely disconnected from any hardware, and
the maintainer's own decision was to wire it for real rather than hide it.
That work was scoped, sequenced, and about to start when the round ended;
`plan.md` has the exact state it was left in.
