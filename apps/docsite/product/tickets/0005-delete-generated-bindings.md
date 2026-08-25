# 0005 — Delete the generated-bindings directory and its tooling

**Status: RESOLVED by the maintainer.** `libs/backend-api/src/lib/generated/`
goes, along with `tauri-typegen` and the unused `tauri-specta`. The
hand-written `BackendCommands` remains the single contract.
**Owners:** `frontend` (delete the TS), `backend` (remove the Cargo tooling, confirm the build still passes without it).
**Depends on:** nothing.
**Feature inventory reference:** new — found by `frontend`'s read-through, escalated by `backend` independently (both hit the same underlying tooling conflict from opposite sides).

## The problem

`libs/backend-api/src/lib/generated/` is 677 lines of `tauri-typegen` output
that:

- imports `zod`, which is **not a dependency** of this repo (the project uses valibot throughout, per root `AGENTS.md` §6),
- references schemas (`DurationSchema`, `RgbSchema`, `GroupIdSchema`, `ParticipantIdSchema`, others) that are **never defined in the file**,
- is exported from nothing and imported by nothing,
- is **already wrong** about the real contract in at least two places: `Cadence` declared as `z.enum(['Slow','Normal','Fast'])` while the Rust enum carries `#[serde(rename_all = "lowercase")]`, and `Achieved.perFrameMs` typed as a `Duration` when Rust serialises it as a float (`serialize_with = "as_millis"`).

It escapes CI because nothing runs `tsc` on `tsconfig.lib.json`. Separately,
`tauri-specta` is also a dependency and appears unused. Three descriptions of
the same command surface (hand-written `BackendCommands`, unused
`tauri-specta`, broken `tauri-typegen` output) is one too many, and the
broken one looked authoritative enough that both `backend` and `frontend`
independently flagged it as a trap.

**Confirmed, not just decided by preference:** `backend` read the
`tauri-typegen` source rather than guessing. It supports exactly two
outputs, `zod` and `none` — it cannot emit valibot, so "switch its output
format" was never actually available. And it would be wrong even with
validation switched off: five types crossing this app's IPC have custom
serde behaviour no type-scraper can see — `Rgb` (hand-written serialiser,
`"#rrggbb"` over a struct that's structurally `{r,g,b}`), `Achieved.perFrameMs`
(custom serialiser), the capability request/response types (`untagged`
unions), and `Cadence` (the casing mismatch already found). `tauri-specta`
has the same blind spot for the same reason, so it doesn't rescue this
either. Also found: the zod output actually comes from `build.rs`, which
hardcodes it and runs on every build; `tauri.conf.json`'s own
`tauri-typegen` block says something different (`"validation_library":
"none"`, a different path) and is completely inert — two contradicting
configurations, one of them decorative.

**Replacement for the drift protection codegen was standing in for:**
shared golden JSON fixtures. `backend` adds Rust tests asserting the exact
serialised JSON of every type crossing the IPC into a committed fixture
file; `frontend` points the matching valibot schemas at the same file.
Either side changing the wire shape unilaterally goes red on both sides —
and it covers the custom-serde cases codegen structurally can't see, since
it's testing actual bytes rather than inferring shape from types. Two tests
already exist in this shape in `libs/openrazer/src/capability.rs`
(`a_lighting_answer_keeps_the_tagged_shape`, `a_success_answer_is_razers_ok`)
— this generalises something already working rather than inventing a new
mechanism. **Awaiting `frontend`'s agreement on this half before backend
builds it out further** — flag back to `po` once confirmed so this can move
from "proposed" to "in progress" in `plan.md`.

## Scope

**`frontend`:**

- Delete `libs/backend-api/src/lib/generated/` entirely.
- Confirm nothing imports from it (a grep, not an assumption — the whole point of this ticket is that it's supposed to be unreferenced already, but confirm before deleting).
- Remove `zod` from `package.json` if it has no other use in the repo.

**`backend`:**

- Remove `tauri-typegen` from `Cargo.toml`/build-deps and whatever `tauri.conf.json`/`build.rs` wiring invokes it.
- Remove the unused `tauri-specta` dependency and its `#[derive(Type)]` usages (`Device`, `DeviceKind`, others) if they exist solely for that generator — check whether anything else (e.g. `TwinklyDevice`'s `Type` derive in `discovery/mod.rs`) depends on the `specta` crate itself rather than the generator; keep the crate if so, remove only the generator invocation.
- Confirm `cargo build`/`cargo check` still succeeds with the tooling removed.
- Add the first golden-JSON-fixture tests for the wire types most likely to drift silently (`Rgb`, `Achieved`, `Cadence`, the capability request/response unions), once `frontend` confirms the approach.

**`frontend`, additionally:**

- Once `backend` lands the golden fixtures, point the matching valibot schemas at the same committed file rather than maintaining a parallel example by hand.

## Acceptance criteria

- [ ] `libs/backend-api/src/lib/generated/` no longer exists.
- [ ] `tsc -p libs/backend-api/tsconfig.lib.json --noEmit` passes (this is the check that would have caught the broken file — worth confirming it's clean now, and worth raising separately whether this should become a real `typecheck` target per CLAUDE.md §13.2/§3, though that's outside this ticket's scope).
- [ ] `cargo check` / `cargo clippy --all-targets` clean with `tauri-typegen` removed.
- [ ] `nx run-many -t lint test build` stays green across all five projects.
- [ ] `BackendCommands` (`libs/backend-api/src/lib/models/backend-commands.ts`) is confirmed as the single, sole source of truth for the wire contract going forward — no comment or doc anywhere should still point at the generated folder as an alternative.
- [ ] **Carries forward to every future capability ticket** (see Track B tickets 0006+): since nothing mechanically checks the TS contract against Rust any more, each of those tickets' acceptance criteria must include `qa` verifying the call against the fake daemon, not only the mock — the mock will happily answer for a contract that's wrong. This item doesn't need its own checkbox here; it's a standing consequence, recorded so nobody re-discovers it the hard way.
