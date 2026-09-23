# backend/src/training/

## What

Serves the operator training hub endpoint, `GET /training-hub` — one of the problem statement's 5 required outcomes.

## Why

Isolated into its own module/controller per the codebase's one-outcome-per-folder convention (see `../README.md`).

## How

`training.controller.ts` loads `data-ml/data/training-content.json` once at startup and serves it as-is from `GET /training-hub`. Per the root `README.md` §4's scope decision, this build uses the "article" format (static e-learning-style content) rather than instructor booking or simulation modules. The 4 module IDs (`TH_SAFE_EFFICIENT_OPS`, `TH_SAFETY_UNDER_PRESSURE`, `TH_TIME_MANAGEMENT`, `TH_GENERAL_REFRESHER`) match exactly what `../operators/cross-feature.service.ts` references for its training recommendations (§9) — not arbitrary IDs.

## File Responsibilities

- **`training.controller.ts`** — defines `TrainingController`, routed at `/training-hub`. `onModuleInit()` reads and parses the JSON file once; `findAll()` handles `GET /training-hub` and returns the cached array. Depended on by `../app.module.ts`.
