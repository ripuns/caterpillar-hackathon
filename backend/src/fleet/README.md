# backend/src/fleet/

## What

Serves the site-wide cost/ROI rollup endpoint, `GET /fleet/cost-summary` (§14, supports README §7.6) — a differentiator feature, not one of the 5 core outcomes.

## Why

Isolated into its own module/controller per the codebase's one-outcome-per-folder convention (see `../README.md`).

## How

`fleet.controller.ts` delegates entirely to `cost-estimation.service.ts`, which computes illustrative (not real CAT figures, documented as such) idle/overrun/incident cost totals across the whole fleet, plus `topRiskOperators` and `topRiskMachines` (ranked lists) and `machinesNearingServiceInterval`. The machine-side figures depend on `../machines/machine-scoring.service.ts`'s Machine Health Score.

## File Responsibilities

- **`fleet.controller.ts`** — defines `FleetController`, routed at `/fleet`. `getCostSummary()` handles `GET /fleet/cost-summary`. Depends on `DataLoaderService`, `CostEstimationService`. Depended on by `../app.module.ts`.
- **`cost-estimation.service.ts`** — defines `CostEstimationService` and the fixed cost constants (`IDLE_COST_PER_MIN`, `OVERRUN_COST_PER_MIN`, `INCIDENT_COST_ESTIMATE`), each documented with its illustrative-estimate reasoning. Depends on `../machines/machine-scoring.service.ts` for machine-side risk ranking.
