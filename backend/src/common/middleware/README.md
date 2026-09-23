# backend/src/common/middleware/

## What

Request-level logging middleware (CONTRACTS.md §8.6): method, path, status code, and duration for every request.

## Why

Baseline observability — every request that hits the API is logged, independent of the decision-level audit logs individual services add (e.g. `RulesService`'s `RULE FIRED` logs, `PredictionController`'s input/output logs).

## How

`logger.middleware.ts` hooks the response's `finish` event to measure duration, then logs one line per request. Applied globally in `../../app.module.ts` via `consumer.apply(LoggerMiddleware).forRoutes('*')`.

## File Responsibilities

- **`logger.middleware.ts`** — defines `LoggerMiddleware`. Depends on nothing else. Depended on by `../../app.module.ts`.
