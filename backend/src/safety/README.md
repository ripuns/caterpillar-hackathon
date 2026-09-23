# backend/src/safety/

## What

Serves the safety alerts endpoint, `GET /safety-alerts` — part of the problem statement's "Safety features" outcome (seatbelt compliance, proximity hazards).

## Why

Isolated into its own module/controller per the codebase's one-outcome-per-folder convention (see `../README.md`).

## How

`safety.controller.ts` exposes a single `GET /safety-alerts` route. Currently returns a hardcoded array matching the exact shape defined in `../../../CONTRACTS.md` §2. This is the stub phase — the real implementation will compute alerts from the loaded dataset using fixed, deterministic rule thresholds (seatbelt unfastened, proximity < 3m) rather than returning static data, per the "safety stays rule-based/explainable" design decision in the root `README.md` §2.

## File Responsibilities

- **`safety.controller.ts`** — defines `SafetyController`, routed at `/safety-alerts`. `findAll()` handles `GET /safety-alerts` and currently returns the stub alert list. Depends on nothing else yet. Depended on by `../app.module.ts`. Will be updated to call a rules service (not yet created) once Dev's `data/operations.csv` is available — see `EXECUTION_PLAN.md` §2.2 Step 2 for the exact rule logic this will implement.
