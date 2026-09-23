# backend/src/behavior/

## What

Serves the unusual-behavior-detection endpoint, `GET /behavior-flags` — one of the problem statement's 5 required outcomes (e.g. excessive idling, unsafe operation patterns).

## Why

Isolated into its own module/controller per the codebase's one-outcome-per-folder convention (see `../README.md`).

## How

`behavior.controller.ts` exposes a single `GET /behavior-flags` route. Currently returns a hardcoded array matching the exact shape defined in `../../../CONTRACTS.md` §3. This is the stub phase — the real implementation will compute flags from the loaded dataset (idling time over threshold, repeated safety alerts per operator) rather than returning static data.

## File Responsibilities

- **`behavior.controller.ts`** — defines `BehaviorController`, routed at `/behavior-flags`. `findAll()` handles `GET /behavior-flags` and currently returns the stub flag list. Depends on nothing else yet. Depended on by `../app.module.ts`. Will be updated to call a rules service (not yet created) once Dev's `data/operations.csv` is available — see `EXECUTION_PLAN.md` §2.2 Step 2 for the exact rule logic this will implement (idling threshold 45 min, unsafe-pattern threshold 3+ alerts per operator, per `../../../CONTRACTS.md`'s finalized thresholds).
