# backend/src/safety/

## What

Serves the safety alerts endpoint, `GET /safety-alerts` — part of the problem statement's "Safety features" outcome (seatbelt compliance, proximity hazards).

## Why

Isolated into its own module/controller per the codebase's one-outcome-per-folder convention (see `../README.md`).

## How

`safety.controller.ts` exposes `GET /safety-alerts`, computing alerts from the loaded `operations.csv` dataset via `RulesService.computeSafetyAlerts()` (`../rules/`) — fixed, deterministic rule thresholds (seatbelt unfastened, proximity < 3m), not a model, per the "safety stays rule-based/explainable" design decision in the root `README.md` §2. Supports pagination (`?page&pageSize`, §8.2).

## File Responsibilities

- **`safety.controller.ts`** — defines `SafetyController`, routed at `/safety-alerts`. `findAll()` handles `GET /safety-alerts`, loads operations via `DataLoaderService`, computes alerts via `RulesService`, and wraps the result with `paginate()` (`../common/pagination.ts`). Depended on by `../app.module.ts`.
