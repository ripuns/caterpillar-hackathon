# backend/src/operators/

## What

Serves the per-operator rollup endpoint, `GET /operators/:operatorId/summary` (§9, supports README §7.3 cross-feature synthesis) — a differentiator feature combining safety, behavior, and task-time signals into one training recommendation.

## Why

Isolated into its own module per the codebase's one-outcome-per-folder convention (see `../README.md`). Ported from Dev's `data-ml/cross_feature.py`, verified to match his reference output exactly.

## How

`cross-feature.service.ts` is deliberately conjunctive — an operator only needs attention if 2-of-3 **independent** signal categories fire (safety, behavior, task), not any single alert. Categories are kept independent of `safetyAlertTriggered` on purpose: that raw column also fires on idling per the dataset's generation rule, which would double-count one idling event as both a safety and behavior signal. When 2+ categories fire, the exact combination maps to one of 4 fixed training modules (`../training/`'s module IDs). `operators.controller.ts` exposes this with 30s TTL caching (§8.4) and `404` for unknown operator IDs.

## File Responsibilities

- **`cross-feature.service.ts`** — defines `CrossFeatureService`, `OperatorSummary`, and the training-trigger threshold constants. Port of `data-ml/cross_feature.py`. Depends on `../data/data-loader.service.ts`'s row types, `../rules/rules.service.ts`'s threshold constants.
- **`operators.controller.ts`** — defines `OperatorsController`, routed at `/operators`. Depends on `DataLoaderService`, `CrossFeatureService`. Depended on by `../app.module.ts`.
