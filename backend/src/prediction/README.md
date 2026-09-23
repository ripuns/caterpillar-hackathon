# backend/src/prediction/

## What

Serves the task-time estimation endpoint, `POST /predict-task-time` — one of the problem statement's 5 required outcomes, and the one genuine ML-based feature in the core build (see root `README.md` §2.1 for why this specific outcome uses a trained model instead of rules).

## Why

Isolated into its own module/controller per the codebase's one-outcome-per-folder convention (see `../README.md`). This is also the integration point with the separate Python `ml-service` (not yet created) — kept in its own folder because its eventual implementation (an outbound HTTP call with fallback logic) is meaningfully different in shape from the other 4 read-only controllers.

## How

`prediction.controller.ts` exposes a single `POST /predict-task-time` route. Currently returns a hardcoded response matching the exact shape defined in `../../../CONTRACTS.md` §4. In the real implementation (`EXECUTION_PLAN.md` §2.2 Steps 3–4), this controller will call the Python `ml-service` over HTTP with a timeout, falling back to an inline weighted-average calculation if that call fails — the response always includes a `source` field (`"model"` or `"fallback_average"`) so callers can tell which path answered.

## File Responsibilities

- **`prediction.controller.ts`** — defines `PredictionController`, routed at `/predict-task-time`. `predict()` handles `POST /predict-task-time`; currently ignores the request body and returns a fixed stub response. Depends on nothing else yet (no `HttpService`/fallback logic wired in). Depended on by `../app.module.ts`. The request body type is currently `unknown` as a placeholder — will be replaced with a typed DTO validating the exact request shape from `../../../CONTRACTS.md` §4 once real logic is implemented (see `EXECUTION_PLAN.md` §7 item 1 for the validation requirement).
