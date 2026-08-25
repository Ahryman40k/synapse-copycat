# 0019 — Wire key/button rebinding (mouse + keyboard → customize)

**Track B, capability ticket — partially re-scoped, per the lead's re-check that `macro` exists on the keypad's DBus surface today.**
**Owner:** `backend` (Rust, design first) + `frontend` (UI + contract).
**Depends on:** `0006-capability-discovery.md` — done.
**Feature inventory reference:** `features.md` §5, "Mouse/Keyboard → Customize — key bindings, 2 layers." The biggest, least-defined item pulled forward from "needs new Rust" — needs a design pass before it can be scoped like `0007`–`0010`.

## Open question, partially answered — a spike is needed before this is scoped precisely

`backend` confirmed `razer.device.macro` (`addMacro`/`deleteMacro`/`getMacros`)
exists on both keyboards checked — so the capability is real, not a false
lead. But `backend`'s own caution: **"cheap to call; the macro payload
format is the unknown... I would not promise this one without a spike."**
And the original concern stands unresolved: OpenRazer's `macro`, in every
other precedent in this codebase, tends to mean _recording and replaying a
sequence of keystrokes_ — not _remapping what a single physical key sends_,
which is what `key-binding.ts`'s `Bindings`/`Assignment` model and the
`KeyGrid`/`AssignmentEditor` UI actually represent. Whether `addMacro`'s
payload can express "key X now sends action Y" (remapping) or only "record
this sequence and trigger it somehow" (macro proper) is exactly what the
spike needs to answer.

**This ticket does not proceed past a spike.** `backend`: a timeboxed
investigation of `addMacro`'s actual payload shape, reported back before
any Rust or TS is written against it.

## Scope, once the spike answers the question above

- Applies to both `mouse-customize.ts` (`MOUSE_CONTROLS`, a flat list of buttons) and `keyboard-customize.ts` (`ANSI_KEYS`, a full keyboard grid) — two UI surfaces over the same `Bindings`/`Assignment`/`BindingLayer` model in `core/models/key-binding.ts`.
- Two layers (`default`, `hypershift`) — confirm whether OpenRazer's model has an equivalent second-layer concept or whether "Hypershift" is a Razer-Synapse-specific term with no daemon equivalent. **Note: this is a removal-class question if the answer is no** — per the standing process rule (see `0007`/`0015`), don't resolve it by deleting the layer concept unilaterally; route it to the maintainer the same way, with `ux`/`po`'s recommendation attached as non-binding.

## Acceptance criteria

- [ ] `backend`'s spike has answered whether `addMacro`'s payload can express remapping, or only sequence-recording — reported back before any build starts, and this ticket's scope written from the actual answer rather than the hoped-for one.
- [ ] If proceeding: a binding set on either page reads from and writes to the real device, follows `capability-states.md`'s structural-absence pattern for devices without the capability, and both layers behave sensibly (or the UI is adjusted if only one layer has a daemon equivalent — a decision routed through `ux`, not invented in code).
- [ ] Wire schema follows root `AGENTS.md` §6.
- [ ] `qa`: verify against the fake daemon once scope is settled — this ticket cannot get fake-daemon acceptance criteria until the open question above is answered.
