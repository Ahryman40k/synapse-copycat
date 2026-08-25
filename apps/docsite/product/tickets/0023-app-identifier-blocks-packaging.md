# 0023 — The application identifier blocks packaging entirely

**Status: awaiting maintainer decision.** Not a technical question —
choosing the real identifier is picking the application's permanent
identity on every Linux desktop, and it drives config paths. `po`/`backend`
are not choosing it.
**Owner:** the maintainer decides the identifier; `backend` applies it.
**Depends on:** nothing to decide; blocks `qa`'s packaging smoke check and `0009`'s (CLAUDE.md §13.10 / the `package-desktop` skill) known issue.
**Credit:** found by `backend` while verifying the `frontendDist` path question.
**Feature inventory reference:** CLAUDE.md §13.9/§13.10, previously unverified — now confirmed as a real, blocking defect rather than a suspected one.

## The problem

`tauri.conf.json`'s `identifier` is still the template default,
`com.tauri.dev`. `tauri build` **refuses immediately** — Tauri requires a
unique identifier per application and rejects the template default outright.
This happens before `frontendDist` is even read, which is why CLAUDE.md
§13.9 (the `frontendDist` path question) sat unverified for so long: nobody
had gotten past this point to find out.

**Consequence: the desktop bundle cannot be built at all today.** This
blocks `qa`'s packaging smoke check entirely, not just partially.

## What's needed

- The maintainer picks the real identifier (conventionally reverse-DNS,
  e.g. `com.example.synapse` or whatever domain/namespace the maintainer
  wants this to live under permanently — this is not easily changed later
  without affecting existing installs' config paths).
- `backend` applies it to `tauri.conf.json`.
- `backend`'s separate `frontendDist` fix (CLAUDE.md §13.9) can then
  actually be verified, since building will get past the identifier check.

## Acceptance criteria

- [ ] The maintainer has provided a real `identifier`.
- [ ] `tauri build` proceeds past the identifier check (does not mean the whole build succeeds — `frontendDist` is the next thing to verify, tracked separately).
- [ ] Point at the `package-desktop` skill for the rest of the packaging flow once this and `frontendDist` are both resolved.
- [ ] `qa`: once both are fixed, run the packaging smoke check that's been blocked, and report whether the produced bundle actually launches.
