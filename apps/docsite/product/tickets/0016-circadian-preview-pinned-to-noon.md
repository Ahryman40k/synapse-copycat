# 0016 — The circadian ambience preview can't show anything but noon

**Owner:** `frontend`.
**Depends on:** nothing. Client-side only, no IPC change.
**Credit:** found by `ux`, written up in `apps/docsite/design/usability-findings.md#circadian-preview-is-pinned-to-noon`; confirmed here by reading the code.
**Feature inventory reference:** adds to `features.md` §1 (ambience authoring).

## The problem

`libs/backend-api/src/lib/models/compose.ts`:

```ts
export const at = (seconds: number): Tick => ({ seconds, dayFraction: 0.5 });
```

`dayFraction` is hardcoded to `0.5` (noon) on every call. `ambience-preview.ts`
and anything else building a `Tick` through `at()` therefore can never show
what a **circadian** brightness source (`day`/`night` levels) looks like at
night — the one setting whose entire point is to look different at
different times. Choosing "0.2 at night, 1.0 by day" and previewing it shows
the day level, always, regardless of what's actually typed in.

This was surfaced while evaluating whether to expose `backend`'s Rust
`preview_ambience` (held, not built — see `plan.md`); `ux`'s recommendation
was that the existing client-side preview already meets the general need,
_except_ for this specific gap, which is unrelated to whether the Rust
preview gets built and is cheap to fix on its own.

## Acceptance criteria

- [ ] The preview can show a chosen time of day, not only noon — either a scrubbable control (a slider labelled by time of day) or, at minimum, showing both the day and night extremes side by side so a circadian source's actual range is visible before it's applied to a group.
- [ ] `compose.spec.ts` (or wherever `at()` is tested) covers a non-noon `dayFraction` actually reaching the composited output.
- [ ] No change to the **applied** ambience's real-time behaviour — the group's actual circadian brightness still tracks the real clock; this ticket only fixes what the _preview_ can show before committing.
- [ ] `qa`: open the ambience panel, choose circadian brightness with visibly different day/night levels, and confirm the preview can show both — not just whatever noon happens to render as.
