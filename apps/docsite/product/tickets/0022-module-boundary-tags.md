# 0022 — `enforce-module-boundaries` is installed and enforces nothing

**Owner:** `frontend` to propose the tag taxonomy; needs sign-off before applying (small change, wide blast radius — every future violation's report depends on it).
**Depends on:** nothing.
**Credit:** found by `frontend` during the control inventory.
**Feature inventory reference:** new.

## The problem

`eslint.config.mjs` declares `depConstraints: [{ sourceTag: '*', onlyDependOnLibsWithTags: ['*'] }]`, and `apps/synapse` and `libs/backend-api` both have `"tags": []` in their `project.json` (only `libs/ui` is tagged). Everything is currently allowed to depend on everything. The visible symptom: `libs/backend-api` imports `HexColor` from `@synapse-copycat/ui` — the wire-contract library depending on the design-system library, an edge nobody chose and no rule caught because no rule actually exists yet.

`frontend` deliberately did not fix this themselves — retagging changes what every future violation reports, so it's a decision about what the layers actually _are_, not a drive-by fix.

## Scope

- Decide the tag taxonomy (e.g. `scope:app`, `scope:contract`, `scope:ui`, or whatever fits the four-project shape: `synapse`, `synapse-e2e`, `backend-api`, `ui`, `docsite`).
- Decide the allowed dependency direction — at minimum, whether `backend-api` should be allowed to depend on `ui` at all (the `HexColor` import is the concrete case to resolve either way: move `HexColor` out of `ui` into somewhere both can reach, or explicitly permit the edge).
- Apply the tags and constraints; confirm the rule actually fires on a deliberately-introduced violation before trusting it.

## Acceptance criteria

- [ ] A tag taxonomy is proposed and agreed (this may need `po`/lead sign-off given the "small change, wide blast radius" note).
- [ ] The `HexColor` import is resolved one way or the other (moved, or the dependency explicitly permitted with a reason).
- [ ] `nx lint` across all projects passes with the new constraints in place.
- [ ] A deliberately-introduced cross-boundary import (added and then reverted) is confirmed to trigger a lint error, proving the rule is live rather than newly-decorative.
