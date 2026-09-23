# backend/src/machines/

## What

Serves the Machine Health Score (§11 `GET /machines/:machineId/health`, §12 `GET /machines`) and Zone/Compound SOS Status (§13 `GET /machines/:machineId/zone-status`) — differentiator features (README §7.4/§7.5), not core outcomes.

## Why

Isolated into its own module per the codebase's one-outcome-per-folder convention (see `../README.md`). Ported from Dev's `data-ml/machine_scoring.py` and `data-ml/zone_status.py` so the backend doesn't depend on shelling out to Python for every request — verified byte-for-byte against his reference JSON outputs (`data-ml/outputs/machine_scores.json`, `zone_status.json`).

## How

`machine-scoring.service.ts` is a weighted, explainable, 0-100 formula (NOT a model) over `operations.csv`, grouped by `machineId` — same design intent and status-band convention (`score-status.ts`) as the Operator Score. `zone-status.service.ts` calls `MachineScoringService` internally rather than duplicating the scoring logic, then applies the compound SOS condition: `machineHealthScore < 40 AND zoneDangerTier == "high"`. `machines.controller.ts` exposes both, with 30s TTL caching (§8.4, same convention as `../operators/`) and `404` for unknown machine IDs.

## File Responsibilities

- **`machine-scoring.service.ts`** — defines `MachineScoringService`, `MachineScore`, `MACHINE_SCORE_WEIGHTS`, `SERVICE_INTERVAL_HOURS_THRESHOLD`. Port of `data-ml/machine_scoring.py`. Depends on `../data/data-loader.service.ts`'s `OperationRow`, `../rules/rules.service.ts`'s threshold constants. Depended on by `zone-status.service.ts`, `machines.controller.ts`, `../fleet/cost-estimation.service.ts`.
- **`zone-status.service.ts`** — defines `ZoneStatusService`, `ZoneStatus`, `ZONE_DANGER_TIERS`, `MACHINE_CRITICAL_SCORE_THRESHOLD`. Port of `data-ml/zone_status.py`. Depends on `MachineScoringService`.
- **`score-status.ts`** — exports `statusForScore()`, the shared status-band function (`EXCELLENT`/`GOOD`/`NEEDS_ATTENTION`/`CRITICAL`). Port of `data-ml/scoring.py`'s `_status_for_score()`.
- **`machines.controller.ts`** — defines `MachinesController`, routed at `/machines`. Depends on `DataLoaderService`, `MachineScoringService`, `ZoneStatusService`. Depended on by `../app.module.ts`.
