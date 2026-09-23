# backend/src/prediction/

## What

Serves the two ML-integration endpoints: `POST /predict-task-time` (one of the problem statement's 5 required outcomes) and `POST /predict-safety-risk` (§4.1, stretch differentiator §7.2).

## Why

Isolated into its own folder per the codebase's one-outcome-per-folder convention (see `../README.md`). Both controllers share the same shape — an outbound HTTP call to the separate Python `ml-service`, with a circuit breaker and (for task-time only) a local fallback — meaningfully different from the other read-only controllers, so they're kept together here rather than split further.

## How

`prediction.controller.ts` calls FastAPI's `/predict-task-time` with a 2s timeout; if the circuit breaker (`../health/ml-service-health.service.ts`) reports the service down, or the call fails/times out, it falls back to an inline `weightedAverageFallback()` — a formula duplicated exactly in `ml-service/main.py` so both fallback paths agree. `safety-risk.controller.ts` follows the same circuit-breaker pattern for `/predict-safety-risk`, but per CONTRACTS.md §4.1 has **no local fallback formula** — there's no safe rule-based number for a risk score, so an unreachable/unready service always surfaces `source: "fallback_unavailable"` rather than fabricate one. Both controllers log every prediction's input, output, and which path answered (§8.6).

## File Responsibilities

- **`prediction.controller.ts`** — defines `PredictionController`, routed at `/predict-task-time`. Depends on `HttpService`, `MlServiceHealthService`. Depended on by `../app.module.ts`.
- **`safety-risk.controller.ts`** — defines `SafetyRiskController`, routed at `/predict-safety-risk`. Currently always returns `fallback_unavailable` since no trained risk model exists yet at `data-ml/model/safety_risk_model.joblib` — see that model's expected shape documented in `ml-service/main.py`'s `predict_safety_risk` docstring. No changes needed here once the model exists. Depends on `HttpService`, `MlServiceHealthService`. Depended on by `../app.module.ts`.
