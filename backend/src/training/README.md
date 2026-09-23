# backend/src/training/

## What

Serves the operator training hub endpoint, `GET /training-hub` — one of the problem statement's 5 required outcomes.

## Why

Isolated into its own module/controller per the codebase's one-outcome-per-folder convention (see `../README.md`).

## How

`training.controller.ts` exposes a single `GET /training-hub` route. Currently returns a hardcoded array matching the exact shape defined in `../../../CONTRACTS.md` §5. Per the root `README.md` §4's scope decision, this build uses the "article" format (static e-learning-style content) rather than instructor booking or simulation modules.

## File Responsibilities

- **`training.controller.ts`** — defines `TrainingController`, routed at `/training-hub`. `findAll()` handles `GET /training-hub` and currently returns one stub module. Depends on nothing else yet. Depended on by `../app.module.ts`. Will be updated to serve Dev's authored training content (`data/training-content.json`, per `EXECUTION_PLAN.md` §2.3 Step 3) once that hand-off happens.
