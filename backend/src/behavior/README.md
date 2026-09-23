# backend/src/behavior/

## What

Serves the unusual-behavior-detection endpoint, `GET /behavior-flags` — one of the problem statement's 5 required outcomes (e.g. excessive idling, unsafe operation patterns).

## Why

Isolated into its own module/controller per the codebase's one-outcome-per-folder convention (see `../README.md`).

## How

`behavior.controller.ts` exposes `GET /behavior-flags`, computing flags from the loaded `operations.csv` dataset via `RulesService.computeBehaviorFlags()` (`../rules/`) — idling time over threshold (45 min), repeated safety alerts per operator (3+), both fixed rule thresholds rather than a model. Supports pagination (`?page&pageSize`, §8.2).

## File Responsibilities

- **`behavior.controller.ts`** — defines `BehaviorController`, routed at `/behavior-flags`. `findAll()` handles `GET /behavior-flags`, loads operations via `DataLoaderService`, computes flags via `RulesService`, and wraps the result with `paginate()` (`../common/pagination.ts`). Depended on by `../app.module.ts`.
